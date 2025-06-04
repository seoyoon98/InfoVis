export function drawRatingFactors(data) {
  const container = d3.select("#rating-factors");
  container.html("");

  container.append("h3").text("Bubble Chart: Ratings vs Popularity");

  const margin = { top: 20, right: 20, bottom: 60, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = data
    .filter(d => d.average_rating > 0 && d.ratings_count > 0 && d.to_read_count >= 0)
    .sort((a, b) => b.ratings_count - a.ratings_count)
    .slice(0, 300);

  const xMax = d3.quantile(filtered.map(d => +d.ratings_count).sort(d3.ascending), 0.98);

  let x = d3.scaleLog()
    .domain([200000, xMax])
    .range([0, width]);

  let y = d3.scaleLinear()
    .domain([3.3, 5.1])
    .range([height, 0]);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(filtered, d => +d.to_read_count)])
    .range([3, 30]);

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  const xAxis = svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(8, ",.2s"));

  const yAxis = svg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y).ticks(8));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .text("Ratings Count");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Average Rating");

  const tooltip = container.append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "5px")
    .style("font-size", "13px")
    .style("border-radius", "4px");

  const circles = svg.selectAll("circle")
    .data(filtered)
    .enter()
    .append("circle")
    .attr("cx", d => x(+d.ratings_count))
    .attr("cy", d => y(+d.average_rating))
    .attr("r", d => r(+d.to_read_count))
    .attr("fill", d => color(d.tag_list?.split(',')[0]?.trim() || "Other"))
    .attr("opacity", 0.7)
    .on("mouseover", function (event, d) {
      const genre = d.tag_list?.split(',')[0]?.trim() || "Unknown";
      tooltip.style("visibility", "visible")
        .html(`<strong>${d.title}</strong><br>Genre: ${genre}<br>Rating: ${d.average_rating}<br>Count: ${d.ratings_count}<br>To-Read: ${d.to_read_count}`);
      d3.select(this).attr("stroke", "black").attr("stroke-width", 1.5);
    })
    .on("mousemove", function (event) {
      tooltip.style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function () {
      tooltip.style("visibility", "hidden");
      d3.select(this).attr("stroke", null);
    })
    .on("click", function (event, d) {
      alert(`You clicked on: ${d.title}`);
    });

  const brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on("end", updateChart);

  svg.append("g")
    .attr("class", "brush")
    .call(brush);

  container.append("button")
    .text("Reset Zoom")
    .style("margin-top", "10px")
    .on("click", () => {
      x.domain([200000, xMax]);
      y.domain([3.3, 5.1]);
      xAxis.transition().duration(800).call(d3.axisBottom(x).ticks(8, ",.2s"));
      yAxis.transition().duration(800).call(d3.axisLeft(y).ticks(8));
      circles.transition().duration(800)
        .attr("cx", d => x(+d.ratings_count))
        .attr("cy", d => y(+d.average_rating));

      svg.append("g")
        .attr("class", "brush")
        .call(brush);
    });

  function updateChart(event) {
    const extent = event.selection;
    if (!extent) return;

    const [[x0, y0], [x1, y1]] = extent;
    const newX = [x.invert(x0), x.invert(x1)];
    const newY = [y.invert(y1), y.invert(y0)];

    x.domain(newX);
    y.domain(newY);

    xAxis.transition().duration(800).call(d3.axisBottom(x).ticks(8, ",.2s"));
    yAxis.transition().duration(800).call(d3.axisLeft(y).ticks(8));

    circles.transition().duration(800)
      .attr("cx", d => x(+d.ratings_count))
      .attr("cy", d => y(+d.average_rating));

    svg.select(".brush").remove();
  }
}
