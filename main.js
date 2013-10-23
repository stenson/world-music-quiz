
var width = 300,
    height = 300;

var canvas = d3.selectAll("canvas")
    .attr("width", width)
    .attr("height", height);

var paths = Array.prototype.map.call(document.querySelectorAll("canvas"), function(c) {
  return d3.geo.path()
    .projection(d3.geo.orthographic()
      .scale(400)
      .translate([width/2,height/2])
      .clipAngle(40))
    .context(c.getContext("2d"));
});

var colors = ["#e41a1c","#377eb8","#4daf4a"];

var land = null,
    countries = null,
    borders = null;

queue()
    .defer(d3.json, "/data/world-110m.json")
    .defer(d3.tsv, "/data/world-country-names.tsv")
    .await(ready);

function ready(error, world, names) {
  land = topojson.feature(world, world.objects.land);
  countries = topojson.feature(world, world.objects.countries).features;
  borders = topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; });
  var n = countries.length;

  countries = countries.filter(function(d) {
    return names.some(function(n) {
      if (d.id == n.id) return d.name = n.name;
    });
  }).sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  startGame();
}

function format(fmt) {
  var args = [].slice.call(arguments, 1);
  return fmt.replace(/%@/g, function() {
    var next = _.head(args);
    args = _.tail(args);
    return next ? next : "";
  });
}

function rand(limit) {
  return Math.floor(Math.random() * limit);
}

function startGame() {
  var randomCountries;
  var correctChoice = 0;
  var artist = null;

  var nextRound = function() {
    correctChoice = rand(paths.length);
    randomCountries = _.map(paths, function() { return countries[rand(countries.length)]; });
    _.each(randomCountries, moveToCountry);

    var urlBase = "http://developer.echonest.com/api/v4/artist/search";
    var url = format("%@?api_key=%@&format=json&artist_location=country:%@&bucket=artist_location&bucket=id:rdio-US&results=10",
      urlBase, keys.echonest, randomCountries[correctChoice].name.replace(/\s/g, "%20"));

    $.get(url, function(response) {
      var artists = response.response.artists;
      artist = artists[rand(artists.length)];
      playArtist(artist);
    });
  };

  d3.selectAll("div.choice-box")
    .on("click", function(d, i) {
      console.log(correctChoice);
      _.each(paths, function(path, i) {
        moveToCountry(randomCountries[correctChoice], i);
      });

      setTimeout(nextRound, 3000);
    });

  nextRound();
}

function playArtist(artist) {
  console.log("playing ", artist);
}

function moveToCountry(country, i) {
  var path = paths[i],
      column = d3.selectAll(format("div.choice-box:nth-child(%@)", i+1)),
      canvas = column.select("canvas");

  canvas.transition()
      .duration(1250)
      .each("start", function() {
        column.select("h3").text(country.name).style("color", colors[i]);
      })
      .tween("rotate", function() {
        var proj = path.projection(),
            c = path.context(),
            p = d3.geo.centroid(country),
            r = d3.interpolate(proj.rotate(), [-p[0], -p[1]]);
        return function(t) {
          proj.rotate(r(t));
          c.clearRect(0, 0, width, height);
          c.fillStyle = "#bdb", c.beginPath(), path(land), c.fill();
          c.fillStyle = colors[i], c.beginPath(), path(country), c.fill();
          c.strokeStyle = "#efe", c.lineWidth = .5, c.beginPath(), path(borders), c.stroke();
          //var b = path.bounds(country);
        };
      });
}