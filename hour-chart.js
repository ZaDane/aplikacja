const margin = { top: 0, right: 20, bottom: 30, left: 20 },
  width = 400 - margin.left - margin.right,
  height = 300 - margin.top - margin.bottom,
  colorA = "#ca89e1",
  colorB = "#8191e9";

export default function createHourChart(data, containerSelector) {
  let svg;
  if (
    d3.select(containerSelector + " .hour-chart-container" + " svg").empty()
  ) {
    svg = d3
      .select(containerSelector + " .hour-chart-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  } else {
    svg = d3.select(containerSelector + " .hour-chart-container" + " svg g");
  }

  const x = d3
    .scaleLinear()
    .domain([0, 24])
    .range([0, width]);

  var yPercentage = d3
    .scaleLinear()
    .domain([0.3, 0])
    .range([0, height]);

  let userHours = Array(24).fill(0);
  let participantHours = Array(24).fill(0);

  data.getParticipantMsgs().forEach(msg => {
    participantHours[msg.date.getHours()] += msg.text.length;
  });
  data.getUserMsgs().forEach(msg => {
    userHours[msg.date.getHours()] += msg.text.length;
  });

  const participantChars = participantHours.reduce(
    (acc, count) => (acc += count),
    0
  );
  const userChars = userHours.reduce((acc, count) => (acc += count), 0);

  userHours.push(userHours[0]);
  participantHours.push(participantHours[0]);

  var yA = d3
    .scaleLinear()
    .domain([0, participantChars])
    .range([0, 1]);

  var yB = d3
    .scaleLinear()
    .domain([0, userChars])
    .range([0, 1]);

  if (svg.select(".path-a").empty()) {
    const xAxis = d3
      .axisBottom(x)
      .tickValues([0, 3, 6, 9, 12, 15, 18, 21, 24])
      .tickFormat(d => d + ":00");
    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.selectAll(".domain").remove();
    svg
      .selectAll(".tick line")
      .attr("y2", -height)
      .style("stroke", "#bbbbbb")
      .style("stroke-width", 0.25);
    svg.selectAll(".tick text").style("color", "#777777");

    svg
      .append("path")
      .datum(participantHours)
      .transition()
      .duration(400)
      .attr("fill", "none")
      .attr("stroke", colorA)
      .attr("stroke-width", 1.5)
      .attr("class", "path-a")
      .attr(
        "d",
        d3
          .line()
          .x((d, i) => x(i))
          .y(d => yPercentage(yA(d)))
      );

    svg
      .append("path")
      .datum(userHours)
      .transition()
      .duration(400)
      .attr("fill", "none")
      .attr("stroke", colorB)
      .attr("stroke-width", 1.5)
      .attr("class", "path-b")
      .attr(
        "d",
        d3
          .line()
          .x((d, i) => x(i))
          .y(d => yPercentage(yB(d)))
      );
  } else {
    svg
      .select(".path-a")
      .datum(participantHours)
      .transition()
      .duration(400)
      .attr(
        "d",
        d3
          .line()
          .x((d, i) => x(i))
          .y(d => yPercentage(yA(d)))
      );

    svg
      .select(".path-b")
      .datum(userHours)
      .transition()
      .duration(400)
      .attr(
        "d",
        d3
          .line()
          .x((d, i) => x(i))
          .y(d => yPercentage(yB(d)))
      );
  }
}
