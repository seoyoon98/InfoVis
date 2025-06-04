export function drawGenreAssociation(data) {
    const container = d3.select("#genre-association");
    container.html("");

    const genreWhitelist = new Set([
        "fantasy", "science fiction", "romance", "mystery", "thriller",
        "historical fiction", "horror", "non-fiction", "young adult",
        "memoir", "biography", "children", "classic",
        "graphic novels", "poetry", "crime", "adventure", "philosophy",
        "middle grade", "new adult", "adult", "teen", "kids", "tween", "parenting"
    ]);

    const tagSet = new Set();
    data.forEach(d => d.tag_list.split(',').forEach(tag => tagSet.add(tag.trim())));
    const uniqueTags = Array.from(tagSet).filter(tag => genreWhitelist.has(tag)).sort();

    const dropdown = container.append("label").text("Select Genre: ")
        .append("select")
        .on("change", function () {
            const selected = this.value;
            d3.select("#genre-info").html("");
            updateChart(selected);
        });

    dropdown.selectAll("option")
        .data(uniqueTags)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    const infoDiv = container.append("div").attr("id", "genre-info").style("margin-top", "20px");

    const margin = { top: 60, right: 20, bottom: 120, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    function updateChart(selectedTag) {
        const tagCount = {};

        data.forEach(d => {
            const tags = d.tag_list.split(',').map(t => t.trim()).filter(t => t);
            if (tags.includes(selectedTag)) {
                tags.forEach(tag => {
                    if (tag !== selectedTag && genreWhitelist.has(tag)) {
                        tagCount[tag] = (tagCount[tag] || 0) + 1;
                    }
                });
            }
        });

        const result = Object.entries(tagCount)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);

        const x = d3.scaleBand()
            .domain(result.map(d => d.tag))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(result, d => d.count)])
            .nice()
            .range([height, 0]);

        const color = d3.scaleOrdinal()
            .domain([...new Set(result.map(d => d.count))])
            .range(d3.schemeSet3.concat(d3.schemeSet1).slice(0, result.length));

        svg.selectAll("g.axis").remove();
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y)
                .ticks(Math.min(5, d3.max(result, d => d.count)))
                .tickFormat(d3.format("d"))
            );

        svg.selectAll(".axis-label").remove();

        svg.append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", height + 100)
            .attr("text-anchor", "middle")
            .text("Co-occurring Genre Tags");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -50)
            .attr("text-anchor", "middle")
            .text("Count of Co-occurrence");

        const bars = svg.selectAll("rect").data(result, d => d.tag);

        bars.enter()
            .append("rect")
            .attr("x", d => x(d.tag))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.count))
            .attr("fill", d => color(d.count))
            .on("click", (event, d) => showTopBooks(d.tag))
            .merge(bars)
            .transition()
            .duration(500)
            .attr("x", d => x(d.tag))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.count))
            .attr("fill", d => color(d.count));

        bars.exit().remove();

        drawBoxPlot();
    }

    function showTopBooks(tag) {
        const filtered = data.filter(d => d.tag_list.includes(tag));

        const topRated = [...filtered].sort((a, b) => b.average_rating - a.average_rating).slice(0, 10);
        const mostToRead = [...filtered].sort((a, b) => b.to_read_count - a.to_read_count).slice(0, 10);

        let html = `<h3>Top 10 Books for "${tag}"</h3>`;

        html += `<h4>Highest Rated</h4><ol>`;
        topRated.forEach(d => {
            html += `<li>${d.title} (${d.average_rating.toFixed(2)})</li>`;
        });
        html += `</ol>`;

        html += `<h4>Most Added to To-Read</h4><ol>`;
        mostToRead.forEach(d => {
            html += `<li>${d.title} (${d.to_read_count})</li>`;
        });
        html += `</ol>`;

        d3.select("#genre-info").html(html);
    }

    function drawBoxPlot() {
        if (d3.select("#box-plot-container").node()) return;

        const boxDiv = container.append("div")
            .attr("id", "box-plot-container")
            .style("margin-top", "40px");

        boxDiv.append("h3").text("Genre-wise Rating Distribution (Box Plot)");

        // 데이터 그룹핑
        const grouped = {};
        data.forEach(d => {
            d.tag_list.split(',').map(t => t.trim()).forEach(tag => {
            if (genreWhitelist.has(tag)) {
                if (!grouped[tag]) grouped[tag] = [];
                    grouped[tag].push(+d.average_rating);
                }
            });
        });

        const boxData = Object.entries(grouped).map(([genre, ratings]) => {
            ratings.sort((a, b) => a - b);
            return {
                genre,
                min: d3.min(ratings),
                q1: d3.quantile(ratings, 0.25),
                median: d3.quantile(ratings, 0.5),
                q3: d3.quantile(ratings, 0.75),
                max: d3.max(ratings)
            };
        });

        const globalMin = d3.min(boxData, d => d.min);
        const globalMax = d3.max(boxData, d => d.max);

        const margin = { top: 10, right: 20, bottom: 80, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 360 - margin.top - margin.bottom;

        const svg = boxDiv.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    
        const x = d3.scaleBand()
            .domain(boxData.map(d => d.genre))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([globalMin - 0.1, globalMax + 0.1])
            .range([height, 0]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g").call(d3.axisLeft(y));

        svg.selectAll("vertLines")
            .data(boxData)
            .enter()
            .append("line")
            .attr("x1", d => x(d.genre) + x.bandwidth() / 2)
            .attr("x2", d => x(d.genre) + x.bandwidth() / 2)
            .attr("y1", d => y(d.min))
            .attr("y2", d => y(d.max))
            .attr("stroke", "black");

        svg.selectAll("boxes")
            .data(boxData)
            .enter()
            .append("rect")
            .attr("x", d => x(d.genre))
            .attr("y", d => y(d.q3))
            .attr("height", d => y(d.q1) - y(d.q3))
            .attr("width", x.bandwidth())
            .attr("stroke", "black")
            .style("fill", "#69b3a2");

        svg.selectAll("medianLines")
            .data(boxData)
            .enter()
            .append("line")
            .attr("x1", d => x(d.genre))
            .attr("x2", d => x(d.genre) + x.bandwidth())
            .attr("y1", d => y(d.median))
            .attr("y2", d => y(d.median))
            .attr("stroke", "black");
        }
        
    
    updateChart(uniqueTags[0]);
}