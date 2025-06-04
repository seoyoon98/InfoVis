export function drawBookFinder(data) {
  const container = d3.select("#book-finder");
  container.html("");

  const controls = container.append("div").attr("class", "filter-controls");

  controls.append("label").text("Minimum Rating: ")
    .append("input")
    .attr("type", "range")
    .attr("min", 0)
    .attr("max", 5)
    .attr("step", 0.1)
    .attr("value", 2.5)
    .on("input", function () {
      d3.select("#min-rating-val").text(this.value);
      updateTable();
      updateBar();
    });

  controls.append("span").attr("id", "min-rating-val").text("2.5");
  controls.append("br");

  controls.append("label").text("Minimum Ratings Count: ")
  .append("input")
  .attr("type", "number")
  .attr("value", 10000)
  .on("keydown", function (event) {
    if (event.key === "Enter") {
      updateTable();
      updateBar();
    }
  })
  .on("change", function () {
    updateTable();
    updateBar();
  });


  controls.append("br");

  controls.append("label").text("Keyword (optional): ")
    .append("input")
    .attr("type", "text")
    .on("input", function () {
      updateTable();
      updateBar();
    });

  const visArea = container.append("div").attr("class", "vis-area");
  const barDiv = visArea.append("div").attr("id", "bar-chart").style("text-align", "center");
  const tableDiv = visArea.append("div").attr("id", "book-table-area");
  const detailDiv = visArea.append("div").attr("id", "book-detail").style("margin-top", "20px").style("text-align", "center");

  const table = tableDiv.append("table").attr("class", "book-table");
  const thead = table.append("thead").append("tr");
  ["Title", "Author", "Rating", "Ratings Count"].forEach(header => {
    thead.append("th").text(header);
  });
  const tbody = table.append("tbody");

  function getFiltered() {
    const minRating = +controls.select("input[type='range']").property("value");
    const minCount = +controls.select("input[type='number']").property("value");
    const keyword = controls.select("input[type='text']").property("value").toLowerCase();

    return data.filter(d =>
      d.average_rating >= minRating &&
      d.ratings_count >= minCount &&
      (!keyword || d.title.toLowerCase().includes(keyword) || d.authors.toLowerCase().includes(keyword))
    ).slice(0, 30);
  }

  function updateTable() {
    const filtered = getFiltered();
    const rows = tbody.selectAll("tr").data(filtered, d => d.book_id);

    const newRows = rows.enter().append("tr");
    newRows.append("td").text(d => d.title).style("cursor", "pointer").on("click", showDetails);
    newRows.append("td").text(d => d.authors);
    newRows.append("td").text(d => d.average_rating.toFixed(2));
    newRows.append("td").text(d => d.ratings_count);

    rows.exit().remove();
  }

  function updateBar() {
    const filtered = getFiltered().sort((a, b) => b.average_rating - a.average_rating).slice(0, 10);
    barDiv.html("");

    const margin = { top: 20, right: 20, bottom: 150, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = barDiv.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(filtered.map(d => d.title))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([2.5, 5.0])
      .range([height, 0]);

    const color = d3.scaleOrdinal(d3.schemeSet3);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5));

    svg.selectAll("rect")
      .data(filtered)
      .enter()
      .append("rect")
      .attr("x", d => x(d.title))
      .attr("y", d => y(d.average_rating))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.average_rating))
      .attr("fill", (d, i) => color(i));

    svg.selectAll("text.label")
      .data(filtered)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", d => x(d.title) + x.bandwidth() / 2)
      .attr("y", d => y(d.average_rating) - 5)
      .attr("text-anchor", "middle")
      .text(d => d.average_rating.toFixed(2));
  }

  function showDetails(event, d) {
    detailDiv.html("");
  
    const resetBtn = detailDiv.append("button")
      .text("Reset Filters")
      .style("margin-bottom", "10px")
      .on("click", () => {
        controls.select("input[type='range']").property("value", 2.5);
        d3.select("#min-rating-val").text("2.5");
        controls.select("input[type='number']").property("value", 1000);
        controls.select("input[type='text']").property("value", "");
  
        detailDiv.html("");
  
        updateTable();
        updateBar();
      });
  
    const margin = { top: 60, right: 20, bottom: 50, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
  
    const svg = detailDiv.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("margin", "0 auto")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(`"${d.title}"`)
      .append("tspan")
      .attr("x", width / 2)
      .attr("dy", "1.2em")
      .text(`by ${d.authors}`);
  
    const thisTags = d.tag_list?.split(',').map(t => t.trim()) || [];
    const neighbors = data.filter(book =>
      book.book_id !== d.book_id &&
      book.average_rating > 0 &&
      book.ratings_count > 0 &&
      thisTags.some(tag => book.tag_list?.includes(tag))
    );
  
    const allPoints = neighbors.concat([d]);
  
    const x = d3.scaleLinear()
      .domain([0, d3.max(allPoints, b => b.ratings_count) * 1.1])
      .range([0, width]);
  
    const y = d3.scaleLinear()
      .domain([0, 5])
      .range([height, 0]);
  
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format(",d")));
  
    svg.append("g").call(d3.axisLeft(y));
  
    svg.selectAll(".neighbor")
      .data(neighbors)
      .enter()
      .append("circle")
      .attr("class", "neighbor")
      .attr("cx", b => x(b.ratings_count))
      .attr("cy", b => y(b.average_rating))
      .attr("r", 4)
      .attr("fill", "#999")
      .attr("opacity", 0.4);
  
    svg.append("circle")
      .attr("cx", x(d.ratings_count))
      .attr("cy", y(d.average_rating))
      .attr("r", 7)
      .attr("fill", "tomato")
      .append("title")
      .text(`${d.title} (${d.average_rating.toFixed(2)} stars)`);
  
    if (neighbors.length >= 2) {
      const xVals = neighbors.map(b => b.ratings_count);
      const yVals = neighbors.map(b => b.average_rating);
      const xMean = d3.mean(xVals);
      const yMean = d3.mean(yVals);
      const slope = d3.sum(xVals.map((xi, i) => (xi - xMean) * (yVals[i] - yMean))) /
                    d3.sum(xVals.map(xi => (xi - xMean) ** 2));
      const intercept = yMean - slope * xMean;
  
      const xStart = d3.min(xVals);
      const xEnd = d3.max(xVals);
      const yStart = slope * xStart + intercept;
      const yEnd = slope * xEnd + intercept;
  
      svg.append("line")
        .attr("x1", x(xStart))
        .attr("y1", y(yStart))
        .attr("x2", x(xEnd))
        .attr("y2", y(yEnd))
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2");
    }
  
    detailDiv.append("div")
      .attr("class", "legend-external")
      .style("margin-top", "10px")
      .style("font-size", "13px")
      .html(`
        <span style="margin-right: 15px;">
          <span style="display:inline-block; width:10px; height:10px; background-color:tomato; border-radius:50%;"></span>
          Selected Book
        </span>
        <span style="margin-right: 15px;">
          <span style="display:inline-block; width:10px; height:10px; background-color:#999; border-radius:50%; opacity:0.4;"></span>
          Related Books
        </span>
        <span>
          <span style="display:inline-block; width:20px; height:2px; background-color:steelblue; border-top: 2px dashed steelblue;"></span>
          Trend line
        </span>
      `);
  }  

  updateTable();
  updateBar();
}