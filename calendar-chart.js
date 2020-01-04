export default function createCalendarchart(data, containerSelector) {
  // set the dimensions and margins of the graph
  var margin = { top: 0, right: 50, bottom: 50, left: 50 },
    width = document.documentElement.clientWidth - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    colorA = "#ca89e1",
    colorB = "#8191e9";

  var svg = d3
    .select(containerSelector + " .timeline-chart-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const tooltip = d3
    .select(containerSelector + " .timeline-chart-container")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "white")
    .style("color", "#B72467");

  const dayChat = data.byInterval(d3.timeDay);

  const conversationBox = setupConversationBox(
    dayChat,
    data,
    containerSelector
  );

  const maxMes = d3.max(dayChat, d => data.countChars(d.msgs));

  const oldest = d3.timeDay.floor(data.getOldest());
  const newest = d3.timeDay.ceil(data.getNewest() + 1);

  const x = d3
    .scaleTime()
    .domain([oldest, newest])
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .domain([0, maxMes])
    .range([height, 0]);

  svg
    .append("path")
    .datum(extendLastStep(dayChat))
    .attr("fill", colorB)
    .attr("stroke", colorB)
    .attr("stroke-width", 1)
    .attr(
      "d",
      d3
        .area()
        .curve(d3.curveStepAfter)
        .x(d => x(new Date(d.time)))
        .y1(d => y(data.countChars(d.msgs)))
        .y0(height)
    );

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

  const timeFormat = d3.timeFormat("%d-%m-%Y");
  d3.select(containerSelector + " .timeline-chart-container svg")
    .on("mousemove", function() {
      const dayHovered = x.invert(d3.mouse(this)[0] - margin.right);
      if (
        dayHovered.getTime() >= d3.timeDay.floor(data.getOldest()).getTime() &&
        dayHovered.getTime() <= data.getNewest()
      ) {
        d3.select(this).style("cursor", "pointer");
        tooltip
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px")
          .style("visibility", "visible")
          .text(timeFormat(dayHovered));
        selectLine
          .style("visibility", "visible")
          .attr("x1", x(d3.timeDay.floor(dayHovered)))
          .attr("x2", x(d3.timeDay.floor(dayHovered)));
      } else {
        d3.select(this).style("cursor", "default");
        selectLine.style("visibility", "hidden");
        tooltip.style("visibility", "hidden");
      }
    })
    .on("mouseout", function() {
      d3.select(this).style("cursor", "default");
      selectLine.style("visibility", "hidden");
      tooltip.style("visibility", "hidden");
    });

  d3.select(containerSelector + " .timeline-chart-container svg").on(
    "click",
    function() {
      const dayClicked = x.invert(d3.mouse(this)[0] - margin.right);
      if (
        dayClicked.getTime() >= d3.timeDay.floor(data.getOldest()).getTime() &&
        dayClicked.getTime() <= data.getNewest()
      ) {
        conversationBox.start(dayClicked);
      }
    }
  );

  const tickSpaces = Math.floor(width / 100);
  let axisTicksDistance = d3.timeMonth.range(oldest, newest);
  let tickEvery = axisTicksDistance.length;
  let interval = 1;
  while (tickEvery > tickSpaces) {
    interval++;
    tickEvery = Math.floor(axisTicksDistance.length / interval);
  }

  const axis = d3
    .axisBottom(x)
    .tickValues(axisTicksDistance.filter((m, i) => i % interval === 0))
    .tickFormat(d3.timeFormat("%m-%Y"));

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(axis);

  svg.selectAll(".domain").remove();
  svg.selectAll(".tick line").remove();
  svg
    .selectAll(".tick text")
    .style("color", "#777777")
    .attr("y", "15");

  const [swearWords, swearMonths] = calcSwearWords(data);
  const maxSwears = d3.max([d3.max(swearMonths, month => month[1]), 1]);
  const swearBars = svg
    .selectAll("bar")
    .data(swearMonths)
    .enter()
    .append("rect")
    .attr(
      "width",
      d => x(d3.timeMonth.offset(new Date(d[0]), 1)) - x(new Date(d[0]))
    )
    .attr("height", "8")
    .attr("x", d => x(new Date(d[0])))
    .attr("y", height + 1)
    .attr("fill", d => d3.interpolateReds(d[1] / maxSwears));

  const spansSwearWords = document.querySelectorAll(
    containerSelector + " .swear-word"
  );
  const spansSwearWordsCount = document.querySelectorAll(
    containerSelector + " .swear-word-count"
  );
  swearWords.sort((a, b) => b.total - a.total);
  swearWords.forEach((word, i) => {
    spansSwearWords[i].textContent = word.root;
    spansSwearWordsCount[i].textContent = word.total;
  });

  const showWordsBut = document.querySelector(
    containerSelector + " .show-swear-words-button"
  );

  showWordsBut.addEventListener("click", () => {
    document
      .querySelectorAll(containerSelector + " .swear-word")
      .forEach(word => {
        word.classList.remove("hidden");
        showWordsBut.disabled = true;
      });
  });
}

function extendLastStep(obj) {
  const lastDay = obj[obj.length - 1].time;
  const extendedLastDay = d3.timeDay.ceil(lastDay + 1);
  obj.push({ time: extendedLastDay.getTime(), msgs: obj[obj.length - 1].msgs });
  return obj;
}

function setupConversationBox(dayChat, data, containerSelector) {
  let current = {
    nextDayIndex: null,
    nextMsgIndex: 0,
    prevDayIndex: null,
    prevMsgIndex: null
  };
  const container = d3.select(containerSelector + " .conversation-box");
  const dateParser = d3.timeFormat("%m-%d-%Y %H:%M");
  d3.select(containerSelector + " .load-next").on("click", () => next());
  d3.select(containerSelector + " .load-prev").on("click", () => prev());

  const rollNext = () => {
    let messages = [];
    while (current.nextDayIndex < dayChat.length && messages.length < 10) {
      if (dayChat[current.nextDayIndex].msgs.length > current.nextMsgIndex) {
        messages.push(dayChat[current.nextDayIndex].msgs[current.nextMsgIndex]);
        current.nextMsgIndex += 1;
      } else {
        current.nextDayIndex += 1;
        current.nextMsgIndex = 0;
      }
    }
    return messages;
  };

  const rollPrev = () => {
    let messages = [];
    while (current.prevDayIndex >= 0 && messages.length < 10) {
      if (current.prevMsgIndex >= 0) {
        messages.push(dayChat[current.prevDayIndex].msgs[current.prevMsgIndex]);
        current.prevMsgIndex -= 1;
      } else {
        current.prevDayIndex -= 1;
        if (current.prevDayIndex >= 0) {
          current.prevMsgIndex = dayChat[current.prevDayIndex].msgs.length - 1;
        }
      }
    }
    return messages;
  };

  const start = wantedDay => {
    const ms = d3.timeDay.floor(wantedDay).getTime();
    current.nextDayIndex = dayChat.findIndex(day => day.time == ms);
    current.prevDayIndex = current.nextDayIndex - 1;
    current.prevMsgIndex = dayChat[current.prevDayIndex].msgs.length - 1;
    cleanVew();
    current.nextMsgIndex = 0;
    appendNewMsgs(rollNext());
  };

  const cleanVew = () => {
    d3.selectAll(
      containerSelector +
        " .message-box-user, " +
        containerSelector +
        " .message-box"
    ).remove();
  };

  const prev = () => {
    appendNewMsgs(rollPrev(), true);
  };

  const next = () => {
    appendNewMsgs(rollNext());
  };

  const appendNewMsgs = (msgs, prev = false) => {
    msgs.forEach(msg => {
      let box;
      if (msg.receiver) {
        box = container.append("div").attr("class", "message-box-user");
        box
          .append("div")
          .attr("class", "message-sender")
          .text(msg.from);
        box
          .append("div")
          .attr("class", "message-receiver")
          .text("→ " + msg.receiver);
        box
          .append("div")
          .attr("class", "message-date")
          .text(dateParser(msg.date));
        box
          .append("div")
          .attr("class", "message-text")
          .text(msg.text);
      } else if (msg.sender) {
        box = container.append("div").attr("class", "message-box");
        box
          .append("div")
          .attr("class", "message-sender")
          .text(msg.sender);
        box
          .append("div")
          .attr("class", "message-date")
          .text(dateParser(msg.date));
        box
          .append("div")
          .attr("class", "message-text")
          .text(msg.text);
      } else if (msg.from === data.getUserName()) {
        box = container.append("div").attr("class", "message-box-user");
        box
          .append("div")
          .attr("class", "message-sender")
          .text(msg.from);
        box
          .append("div")
          .attr("class", "message-date")
          .text(dateParser(msg.date));
        box
          .append("div")
          .attr("class", "message-text")
          .text(msg.text);
      } else if (msg.from === data.getParticipantName()) {
        box = container.append("div").attr("class", "message-box");
        box
          .append("div")
          .attr("class", "message-sender")
          .text(msg.from);
        box
          .append("div")
          .attr("class", "message-date")
          .text(dateParser(msg.date));
        box
          .append("div")
          .attr("class", "message-text")
          .text(msg.text);
      }
      if (prev) {
        box.lower();
      }
    });
  };

  return { start };
}

function calcSwearWords(data) {
  const swearWords = [
    { root: "kurwa", variants: ["kurw"], total: 0 },
    { root: "jebać", variants: ["jeb"], total: 0 },
    {
      root: "pierdolić",
      variants: ["pierdol", "pierdal", "pierdziel"],
      total: 0
    },
    { root: "fuck", variants: ["fuck"], total: 0 },
    { root: "srać", variants: ["sra"], total: 0 },
    { root: "pizda", variants: ["pizd", "piźd"], total: 0 },
    { root: "kutas", variants: ["kutas"], total: 0 },
    { root: "fiut", variants: ["fiut", "fiucie"], total: 0 },
    { root: "cwel", variants: ["cwel"], total: 0 },
    { root: "chuj", variants: ["chuj"], total: 0 },
    {
      root: "ciota",
      variants: ["ciota", "cioty", "cioto", "ciotę", "ciotą"],
      total: 0
    }
  ];

  const monthCount = d3.timeMonth
    .range(d3.timeMonth.floor(data.getOldest()), data.getNewest())
    .map(month => [month.getTime(), 0]);

  const swearRegExp = new RegExp(
    swearWords
      .reduce((acc, curr) => acc + "|" + curr.variants.join("|"), "")
      .slice(1),
    "g",
    "i"
  );

  let userMsgs = data.getUserMsgs();
  userMsgs.forEach(msg => {
    const wordsInMsg = msg.text.match(swearRegExp);
    if (wordsInMsg) {
      wordsInMsg.forEach(found => {
        swearWords.find(swearWord =>
          swearWord.variants.includes(found)
        ).total += 1;
        monthCount.find(
          month => month[0] === d3.timeMonth.floor(msg.date).getTime()
        )[1] += 1;
      });
    }
  });

  return [swearWords, monthCount];
}
