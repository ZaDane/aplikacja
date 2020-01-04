// set the dimensions and margins of the graph
const margin = { top: 0, right: 0, bottom: 0, left: 0 },
  spacing = 0,
  barHeight = 20,
  width = 400 - margin.left - margin.right,
  height = barHeight * 2 + spacing - margin.top - margin.bottom,
  colorA = "#ca89e1",
  colorB = "#8191e9";

function computeTotalCharsBar(data) {
  const charsOther = d3.sum(data.getParticipantMsgs(), msg => msg.text.length);
  const charsUser = d3.sum(data.getUserMsgs(), msg => msg.text.length);

  return [charsOther, charsUser];
}

function computeLongestMsgBar(data) {
  const longestOther = d3.max(
    data.getParticipantMsgs(),
    msg => msg.text.length
  );
  const longestUser = d3.max(data.getUserMsgs(), msg => msg.text.length);

  return [longestOther, longestUser];
}

function computePerDayBar(data) {
  const oldest = data.getOldest();
  const newest = data.getNewest();

  const dayCount = d3.timeDay.count(new Date(oldest), new Date(newest));

  const otherMsgsCount = data.getParticipantMsgs().length;
  const userMsgsCount = data.getUserMsgs().length;

  const otherPerDay = Math.round(otherMsgsCount / dayCount);
  const userPerDay = Math.round(userMsgsCount / dayCount);

  return [otherPerDay, userPerDay];
}

function computeAvgLenBar(data) {
  const [charsOther, charsUser] = computeTotalCharsBar(data);
  const avgLenOther = Math.round(charsOther / data.getParticipantMsgs().length);
  const avgLenUser = Math.round(charsUser / data.getUserMsgs().length);
  return [avgLenOther, avgLenUser];
}

function insertBarSvg(containerSelector) {
  return d3
    .select(containerSelector)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}

function createBar(a, b, container) {
  if (d3.select(container + " svg").empty()) {
    const svg = insertBarSvg(container);

    const scale = d3
      .scaleLinear()
      .domain([0, a + b])
      .range([0, width]);

    svg
      .append("rect")
      .attr("width", () => scale(a))
      .attr("height", barHeight)
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", colorA)
      .attr("class", "bar-a");

    svg
      .append("rect")
      .attr("width", scale(b))
      .attr("height", barHeight)
      .attr("x", 0)
      .attr("y", barHeight + spacing)
      .attr("fill", colorB)
      .attr("class", "bar-b");

    svg
      .append("text")
      .attr("x", 10)
      .attr("y", barHeight - 5)
      .attr("class", "bar-label bar-label-a")
      .text(a);

    svg
      .append("text")
      .attr("x", 10)
      .attr("y", height - 5)
      .attr("class", "bar-label bar-label-b")
      .text(b);
  } else {
    const svg = d3.select(container + " svg");

    const scale = d3
      .scaleLinear()
      .domain([0, a + b])
      .range([0, width]);

    svg
      .select(".bar-a")
      .transition()
      .duration(400)
      .attr("width", () => scale(a));

    svg
      .select(".bar-b")
      .transition()
      .duration(400)
      .attr("width", scale(b));

    svg.select(".bar-label-a").text(Math.round(a));

    svg.select(".bar-label-b").text(Math.round(b));
  }
}

export default function createBars(data, containerSelector) {
  const [charsOther, charsUser] = computeTotalCharsBar(data);
  createBar(charsOther, charsUser, containerSelector + " .num-bar-container");

  const [longestOther, longestUser] = computeLongestMsgBar(data);
  createBar(
    longestOther,
    longestUser,
    containerSelector + " .longest-bar-container"
  );

  const [perDayOther, perDayUser] = computePerDayBar(data);
  createBar(
    perDayOther,
    perDayUser,
    containerSelector + " .per-day-bar-container"
  );

  const [avgOther, avgUser] = computeAvgLenBar(data);
  createBar(avgOther, avgUser, containerSelector + " .avg-len-bar-container");
}
