// set the dimensions and margins of the graph
var margin = { top: 30, right: 20, bottom: 30, left: 20 },
  width =
    document.documentElement.clientWidth * 0.8 - margin.left - margin.right,
  height = 800 - margin.top - margin.bottom,
  colorA = "#B99FCD",
  colorB = "#A09FCB";

var svg = insertSvg(".ranking-chart-container");

export default function createFriendsRanking(data, createChatStats) {
  const [oldest, newest] = [data.getOldest(), data.getNewest()].map(
    ms => new Date(ms)
  );

  const months = d3.timeMonth.range(d3.timeMonth.floor(oldest), newest, 1);

  // Get stats for everyone
  const dataStats = data.byPeople().map(person => {
    // split by months
    const monthly = data.byInterval(d3.timeMonth, person.values);
    return {
      person: person.key,
      stats: monthly.map(month => {
        // and further by days with total chars summed
        return {
          month: month.time,
          days: data
            .byInterval(
              d3.timeDay,
              month.msgs,
              d3.timeMonth.floor(new Date(month.time)),
              d3.timeMonth.ceil(new Date(month.time + 1))
            )
            .map(day => {
              return { day: day.time, chars: data.countChars(day.msgs) };
            })
        };
      })
    };
  });

  const allTimeTop = getTopTenChars(oldest, newest, dataStats);
  createLines(extractDaysFromMonths(oldest, newest, allTimeTop));
  createBars(allTimeTop, data, createChatStats);

  const slider = document.querySelector(".ranking-slider");
  const sliderVals = months.map(month => dateToSliderVal(month));

  noUiSlider.create(slider, {
    start: [sliderVals[0], sliderVals[sliderVals.length - 1]],
    connect: true,
    step: 1,
    range: {
      min: sliderVals[0],
      max: sliderVals[sliderVals.length - 1]
    },
    tooltips: [
      { to: sliderValToText, from: sliderValToDate },
      { to: sliderValToText, from: sliderValToDate }
    ],
    pips: {
      mode: "positions",
      values: [0, 25, 50, 75, 100],
      density: 4,
      stepped: true,
      format: { to: sliderValToText, from: sliderValToDate }
    }
  });

  slider.noUiSlider.on("change", monthsChosen => {
    const newStart = sliderValToDate(monthsChosen[0]);
    const newEnd = sliderValToDate(monthsChosen[1]);
    const newTop = getTopTenChars(newStart, newEnd, dataStats);
    createBars(newTop);
    updateLines(extractDaysFromMonths(newStart, newEnd, newTop));
  });
}

function insertSvg(containerClass) {
  return d3
    .select(containerClass)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}

function createLines(data) {
  const maxDayChars = d3.max(
    data.map(person => d3.max(person.days, day => day.chars))
  );
  const y = d3
    .scaleLinear()
    .domain([0, maxDayChars])
    .range([height / 10, 5]);

  const oldest = new Date(data[0].days[0].day);
  const newest = new Date(data[0].days[data[0].days.length - 1].day);

  const x = d3
    .scaleTime()
    .domain([oldest, newest])
    .range([width / 2 + margin.left, width]);

  const axisMonths = d3.timeMonth.range(oldest, newest);
  const tickInterval = calcTickInterval(axisMonths);

  const axis = d3
    .axisTop(x)
    .tickValues(axisMonths.filter((m, i) => i % tickInterval === 0))
    .tickFormat(d3.timeFormat("%m-%Y"));

  svg
    .append("g")
    .attr("class", "axis")
    .call(axis);

  svg.selectAll(".domain").remove();
  svg
    .selectAll(".tick line")
    .attr("y2", height)
    .style("stroke", "#bbbbbb")
    .style("stroke-width", 0.25);
  svg.selectAll(".tick text").style("color", "#777777");

  data.forEach((person, i) => {
    svg
      .append("path")
      .datum(person.days)
      .attr("class", "activity-line" + i)
      .attr("fill", "none")
      .attr("stroke", colorB)
      .attr("stroke-width", 1)
      .attr(
        "d",
        d3
          .line()
          .x(d => x(new Date(d.day)))
          .y(d => y(d.chars) + i * (height / 10))
      );
  });

  setupTooltipHandler(x, oldest, newest);
}

function updateLines(data) {
  const maxDayChars = d3.max(
    data.map(person => d3.max(person.days, day => day.chars))
  );
  const y = d3
    .scaleLinear()
    .domain([0, maxDayChars])
    .range([height / 10, 5]);

  const oldest = new Date(data[0].days[0].day);
  const newest = new Date(data[0].days[data[0].days.length - 1].day);

  const x = d3
    .scaleTime()
    .domain([oldest, newest])
    .range([width / 2 + margin.left, width]);

  const axisMonths = d3.timeMonth.range(oldest, newest);
  const tickInterval = calcTickInterval(axisMonths);

  const axis = d3
    .axisTop(x)
    .tickValues(axisMonths.filter((m, i) => i % tickInterval === 0))
    .tickFormat(d3.timeFormat("%m-%Y"));

  svg.select(".axis").remove();
  svg
    .append("g")
    .attr("class", "axis")
    .call(axis);

  svg.selectAll(".domain").remove();
  svg
    .selectAll(".tick line")
    .attr("y2", height)
    .style("stroke", "#bbbbbb")
    .style("stroke-width", 0.25);
  svg.selectAll(".tick text").style("color", "#777777");

  data.forEach((person, i) => {
    svg
      .select(".activity-line" + i)
      .data([person.days])
      .attr(
        "d",
        d3
          .line()
          .x(d => x(new Date(d.day)))
          .y(d => y(d.chars) + i * (height / 10))
      );
  });

  setupTooltipHandler(x, oldest, newest);
}

function createBars(top, data, createChatStats) {
  const scaleX = d3
    .scaleLinear()
    .domain([0, d3.max(top, d => d.chars)])
    .range([0, width / 2 - margin.right]);

  const scaleY = d3
    .scaleLinear()
    .domain([0, 10])
    .range([0, height]);

  const bar = svg.selectAll(".bar").data(top, d => d.person);
  bar
    .enter()
    .append("rect")
    .style("fill", colorB)
    .attr("opacity", 1)
    .attr("width", d => scaleX(d.chars))
    .attr("class", "bar")
    .attr("y", height)
    .attr("x", 0)
    .transition()
    .duration(400)
    .attr("height", 20)
    .attr("y", (d, i) => scaleY(i) + 15);

  bar
    .exit()
    .transition()
    .duration(400)
    .attr("y", height - 5)
    .attr("opacity", 0)
    .remove();

  bar
    .transition()
    .duration(400)
    .attr("y", (d, i) => scaleY(i) + 15)
    .attr("width", d => scaleX(d.chars));

  const name = svg.selectAll(".name").data(top);
  name
    .enter()
    .append("text")
    .text(d => d.person)
    .attr("opacity", 1)
    .attr("class", "name")
    .attr("x", 0)
    .attr("y", height - 5)
    .on("click", d =>
      createChatStats(
        data.extractDataWithPerson(d.person),
        ".conversation-section"
      )
    )
    .transition()
    .duration(400)
    .attr("y", (d, i) => scaleY(i) - 5 + 15);

  name
    .exit()
    .transition()
    .duration(400)
    .attr("y", height - 5)
    .attr("opacity", 0)
    .remove();

  name
    .transition()
    .duration(400)
    .text(d => d.person)
    .attr("y", (d, i) => scaleY(i) - 5 + 15);

  const charNum = svg.selectAll(".char-num").data(top);
  charNum
    .enter()
    .append("text")
    .text(d => d.chars)
    .attr("opacity", 1)
    .attr("class", "char-num")
    .attr("x", 0)
    .attr("font-size", "14")
    .attr("y", height + 38)
    .transition()
    .duration(400)
    .attr("y", (d, i) => scaleY(i) + 38 + 15);

  charNum
    .exit()
    .transition()
    .duration(400)
    .attr("y", height - 5)
    .attr("opacity", 0)
    .remove();

  charNum
    .transition()
    .duration(400)
    .text(d => d.chars)
    .attr("y", (d, i) => scaleY(i) + 38 + 15);
}

function getTopTenChars(start, end, stats) {
  return stats
    .map(user => {
      return {
        ...user,
        chars: d3.sum(
          user.stats.filter(
            month =>
              month.month <= end.getTime() &&
              month.month >= d3.timeMonth.floor(start.getTime())
          ),
          month => d3.sum(month.days, day => day.chars)
        )
      };
    })
    .sort((a, b) =>
      b.chars < a.chars ? -1 : b.chars > a.chars ? 1 : b.chars >= a ? 0 : NaN
    )
    .slice(0, 10)
    .filter(user => user.chars > 0);
}

function extractDaysFromMonths(start, end, stats) {
  const statsExtracted = [];
  stats.forEach(user => {
    let days = [];
    user.stats
      .filter(
        month =>
          month.month <= end.getTime() &&
          month.month >= d3.timeMonth.floor(start.getTime())
      )
      .forEach(month => {
        month.days.forEach(day => days.push({ ...day }));
      });
    statsExtracted.push({ person: user.person, days: days });
  });
  return statsExtracted;
}

const tooltip = d3
  .select(".ranking-chart-container")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("visibility", "hidden")
  .style("background", "white");

const selectLine = svg
  .append("line")
  .attr("class", "select-line")
  .attr("x1", 0)
  .attr("y1", 0)
  .attr("x2", 0)
  .attr("y2", height)
  .style("stroke-width", 1)
  .style("stroke", "#B72467")
  .style("fill", "none")
  .style("visibility", "hidden");

function setupTooltipHandler(axis, oldest, newest) {
  const timeFormat = d3.timeFormat("%d-%m-%Y");
  d3.select(".ranking-chart-container svg")
    .on("mousemove", null)
    .on("mousemove", function() {
      const dayHovered = axis.invert(d3.mouse(this)[0] - margin.right);
      if (
        dayHovered.getTime() >= d3.timeDay.floor(oldest).getTime() &&
        dayHovered.getTime() <= newest.getTime()
      ) {
        tooltip
          .style("top", event.pageY - margin.top + "px")
          .style("left", event.pageX + margin.top + "px")
          .style("visibility", "visible")
          .text(timeFormat(dayHovered));
        selectLine
          .style("visibility", "visible")
          .attr("x1", axis(d3.timeDay.floor(dayHovered)))
          .attr("x2", axis(d3.timeDay.floor(dayHovered)));
      } else {
        d3.select(this).style("cursor", "default");
        selectLine.style("visibility", "hidden");
        tooltip.style("visibility", "hidden");
      }
    })
    .on("mouseout", null)
    .on("mouseout", function() {
      selectLine.style("visibility", "hidden");
      tooltip.style("visibility", "hidden");
    });
}

function calcTickInterval(axisMonths) {
  const tickSpaces = Math.floor(width / 150);
  let tickEvery = axisMonths.length;
  let interval = 1;
  while (tickEvery > tickSpaces) {
    interval++;
    tickEvery = Math.floor(axisMonths.length / interval);
  }
  return interval;
}

function dateToSliderVal(date) {
  return date.getFullYear() * 12 + date.getMonth();
}
function sliderValToText(val) {
  const date = sliderValToDate(val);
  return d3.timeFormat("%m-%Y")(date);
}
function sliderValToDate(val) {
  const valNum = parseInt(val);
  return new Date(Math.floor(valNum / 12), valNum % 12);
}
