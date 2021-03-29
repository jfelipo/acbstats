const $ = (s) => document.querySelector(s);

const settings = {
  padding: { left: 60, top: 60, right: 40, bottom: 40 },
  width: 400,
  height: 800,
  size: 800,
  logoSize: 50,
};

// stats should be a list of player objects
function graph(stats) {
  const svg = d3.select('#canvas');

  // Rotate the stats through 45* and use that as the domain
  const oext = d3.extent(stats, d => d.off_rtg),
    dext = d3.extent(stats, d => d.def_rtg),
    ocenter = (oext[0] + oext[1]) / 2,
    dcenter = (dext[0] + dext[1]) / 2,
    // store the sin and cos of 45*. Of course they're equal, but it keeps the
    // equation clearer to leave them both here
    sin_th = Math.sin(-Math.PI/4),
    cos_th = Math.cos(-Math.PI/4);

  const xt = (x, y) => {
    return (x - ocenter) * cos_th - (y - dcenter) * sin_th;
  }

  const yt = (x, y) => {
    return (x - ocenter) * sin_th + (y - dcenter) * cos_th;
  }

  // this doesn't work because I'm rotating around the (0,0) origin! need to rotate around the center, but I don't know the center
  // I now have the center I need to translate to
  stats.forEach(d => {
    d.off_rtg_trans = xt(d.off_rtg, d.def_rtg);
    d.def_rtg_trans = yt(d.off_rtg, d.def_rtg);
  });
  console.log(stats.map(d => `${d.off_rtg_trans}, ${d.def_rtg_trans}`))

  const toext = d3.extent(stats, d => d.off_rtg_trans),
    omargin = (toext[1] - toext[0]) * .2,
    xmin = toext[0] - omargin,
    xmax = toext[1] + omargin;

  const x = d3.scaleLinear()
    .domain([xmin, xmax])
    .range([0, settings.width]);

  const tdext = d3.extent(stats, d => d.def_rtg_trans),
    dmargin = (tdext[1] - tdext[0]) * .2,
    ymin = tdext[0] - dmargin,
    ymax = tdext[1] + dmargin;

  const y = d3.scaleLinear()
    .domain([ymin, ymax])
    .range([0, settings.height]);

  const xAxis = g => g
    .call(d3.axisBottom(x).tickSizeOuter(0));

  const yAxis = g => g
    .call(d3.axisLeft(y).tickSizeOuter(0));

  const g = svg.append("g")

  g.append("g")
    .attr("class", "logos")
    .selectAll("image")
    .data(stats)
    .join("image")
    .attr("x", d => x(d.off_rtg_trans) - (settings.logoSize / 2))
    .attr("y", d => y(d.def_rtg_trans) - (settings.logoSize / 2))
    .attr("width", settings.logoSize)
    .attr("height", settings.logoSize)
    .attr("href", d => `../logos/${d.name}.svg`);

  g.append("g")
    .attr("class", "xticks")
    .selectAll("line")
    .data([100, 105, 110, 115, 120, 125])
    .join("line")
    .attr("x1", d => x(xt(d, dext[0])))
    .attr("y1", d => y(yt(dext[0], d)))
    .attr("x2", d => x(xt(d, dext[1])))
    .attr("y2", d => y(yt(dext[1], d)))
    .attr("stroke", "lightgray");

  g.append("g")
    .attr("class", "yticks")
    .selectAll("line")
    .data([100, 105, 110, 115, 120, 125])
    .join("line")
    .attr("x1", d => x(xt(oext[0], d)))
    .attr("y1", d => y(yt(d, oext[0])))
    .attr("x2", d => x(xt(oext[1], d)))
    .attr("y2", d => y(yt(d, oext[1])))
    .attr("stroke", "lightgray");

  // tooltip modified from
  // https://next.observablehq.com/@giorgiofighera/histogram-with-tooltips-and-bars-highlighted-on-mouse-over
  const tooltip = d3.select(".tooltip");
  svg.selectAll("image")
    .on("mouseover", function(_evt, d) {
      d3.select(this)
        .attr('stroke-width', '2')
        .attr("stroke", "black");
      tooltip
        .style("visibility", "visible")
        .html(`<strong>${d.name}</strong> (${d.wins}-${d.losses})<br>Offensive Rating: ${d.off_rtg}<br>Defensive Rating: ${d.def_rtg}`);
    })
    .on("mousemove", function(evt) {
      tooltip
        .style("top", evt.pageY - 10 + "px")
        .style("left", evt.pageX + 10 + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr('stroke-width', '0');

      tooltip.style("visibility", "hidden");
    });
}

window.addEventListener('DOMContentLoaded', async (_evt) => {
  const res = await fetch('../data/2021/team_stats.json');
  const statsObj = await res.json();
  window.stats = Object.values(statsObj);

  graph(window.stats);
});
