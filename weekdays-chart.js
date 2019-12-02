const margin = { top: 0, right: 20, bottom: 30, left: 20 },
  width = 400 - margin.left - margin.right,
  barSpacing = 10,
  barWidth = (width - barSpacing * 6) / 14,
  height = 300 - margin.top - margin.bottom,
  colorA = "#B99FCD",
  colorB = "#A09FCB";

export default function createWeekdaysChart(data, containerSelector) {
  let userByDays = extractDayCharCount(data.getUserMsgs());
  let otherByDays = extractDayCharCount(data.getParticipantMsgs());

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(userByDays.concat(otherByDays))])
    .range([0, height]);

  let svg;
  if (
    d3.select(containerSelector + " .weekdays-chart-container" + " svg").empty()
  ) {
    svg = d3
      .select(containerSelector + " .weekdays-chart-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  } else {
    svg = d3.select(
      containerSelector + " .weekdays-chart-container" + " svg g"
    );
  }

  if (svg.select(".rect-user").empty()) {
    svg
      .selectAll(".rect-user")
      .data(userByDays)
      .enter()
      .append("rect")
      .attr("class", "rect-user")
      .attr("x", (d, i) => 2 * i * barWidth + i * barSpacing + barWidth)
      .attr("width", barWidth)
      .attr("y", d => height - y(d))
      .attr("height", d => y(d))
      .style("fill", colorB);

    svg
      .selectAll(".rect-other")
      .data(otherByDays)
      .enter()
      .append("rect")
      .attr("class", "rect-other")
      .attr("x", (d, i) => 2 * i * barWidth + i * barSpacing)
      .attr("width", barWidth)
      .attr("y", d => height - y(d))
      .attr("height", d => y(d))
      .style("fill", colorA);

    const labels = ["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."];

    svg
      .selectAll(".labels")
      .data(labels)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d, i) => 2 * i * barWidth + i * barSpacing + barWidth)
      .attr("y", height + 15)
      .text(d => d);
  } else {
    svg
      .selectAll(".rect-user")
      .data(userByDays)
      .transition()
      .duration(400)
      .attr("y", d => height - y(d))
      .attr("height", d => y(d));

    svg
      .selectAll(".rect-other")
      .data(otherByDays)
      .transition()
      .duration(400)
      .attr("y", d => height - y(d))
      .attr("height", d => y(d));
  }
}

function extractDayCharCount(stats) {
  let person = [0, 0, 0, 0, 0, 0, 0];
  stats.forEach(msg => {
    person[msg.date.getDay()] += msg.text.length;
  });
  // Put Sunday as 7th
  person.push(person.shift());
  return person;
}
