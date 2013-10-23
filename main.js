
var width = 300,
    height = 300;

var canvas = d3.selectAll("canvas")
    .attr("width", width)
    .attr("height", height)

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

  moveToRandomCountry();
}

function moveToRandomCountry() {
  paths.forEach(function(path, i) {
    moveToCountry(path, countries[Math.floor(Math.random() * countries.length)], i);
  });
}

function moveToCountry(path, country, i) {
  d3.select(document.querySelectorAll("canvas")[i]).transition()
      .duration(1250)
      .each("start", function() {
        //title.text(country.name);
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