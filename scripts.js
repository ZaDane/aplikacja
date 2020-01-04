import { objectifyWhatsAppChat, objectifyFbChat } from "./objectifyChat.js";
import createDataSource from "./data-source.js";
import createBars from "./bar-charts.js";
import createHourChart from "./hour-chart.js";
import createCalendarchart from "./calendar-chart.js";
import createFriendsRanking from "./friends-ranking.js";
import createWeekdaysChart from "./weekdays-chart.js";
import createFriendsDailyChart from "./friends-daily-chart.js";

// const inputElementWhatsApp = document.getElementById("whatsapp-file");
// inputElementWhatsApp.addEventListener("change", handleWhatsAppInput, false);
// function handleWhatsAppInput() {
//   const file = this.files[0];
//   const reader = new FileReader();
//   reader.readAsText(file);
//   reader.onload = () => {
//     createChatStats(objectifyWhatsAppChat(reader.result));
//   };
// }

// const inputElementFb = document.getElementById("fb-file");
// inputElementFb.addEventListener("change", handleFbInput, false);
// function handleFbInput() {
//   const file = this.files[0];
//   const reader = new FileReader();
//   reader.readAsText(file);
//   reader.onload = () => {
//     const data = createDataSource(objectifyFbChat(reader.result));
//     createChatStats(data, ".general-section");
//   };
// }

function createChatStats(data, containerSelector) {
  const cont = d3.select(containerSelector);
  cont.style("display", "flex");
  if (containerSelector == ".conversation-section") {
    cleanConvSection(data);
  }
  createBars(data, containerSelector);
  createHourChart(data, containerSelector);
  createCalendarchart(data, containerSelector);
  createWeekdaysChart(data, containerSelector);
  setupSlider(data, containerSelector);
  document
    .querySelector(containerSelector)
    .scrollIntoView({ behavior: "smooth" });
}

new LuminousGallery(document.querySelectorAll(".intro-gallery-item a"));

document.getElementById("fb-dir").addEventListener(
  "change",
  function(event) {
    document.querySelector(".loader-container").style.display = "flex";
    let conversationFiles = [...event.target.files].filter(file =>
      /json$/.test(file.name)
    );
    let filePromises = [];
    conversationFiles.forEach(file => {
      filePromises.push(
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsText(file);
          reader.onload = () => {
            try {
              const stats = objectifyFbChat(reader.result);
              resolve(stats);
            } catch (e) {
              resolve(false);
            }
          };
        })
      );
    });
    Promise.all(filePromises).then(vals => {
      try {
        // Get rid of falses
        let conversations = vals.filter(val => val);
        let stats = [
          { name: "Others", msgs: [] },
          // FB always outputs the user as second
          { name: conversations[0][1].name, msgs: [] }
        ];
        conversations.forEach(conv => {
          stats[0].msgs = stats[0].msgs.concat(
            // Add sender's name
            conv[0].msgs.map(msg => {
              msg.sender = conv[0].name;
              return msg;
            })
          );
          stats[1].msgs = stats[1].msgs.concat(
            conv[1].msgs.map(msg => {
              msg.receiver = conv[0].name;
              return msg;
            })
          );
        });
        const data = createDataSource(stats);
        d3.select(".general-section").style("display", "flex");
        document.querySelector(".loader-container").style.display = "none";
        document.querySelector(".not-yet-loaded-message").style.display =
          "none";
        document.querySelector(".instruction-section").style.display = "none";
        document.querySelector(".fb-dir-label").style.display = "none";
        createFriendsRanking(data, createChatStats);
        createFriendsDailyChart(data, ".general-section");
        createChatStats(data, ".general-section");
      } catch (e) {
        console.log(e);
        showError();
        return;
      }
    });
  },
  false
);

function showError() {
  const container = document.querySelector(".loader-container");
  container.classList.add("error");
  document
    .querySelector(".loader-error-button")
    .addEventListener("click", () => {
      container.classList.remove("error");
      container.style.display = "none";
    });
}

function setupSlider(data, containerSelector) {
  const possibleYears = d3.timeYear
    .range(d3.timeYear.floor(data.getOldest()), data.getNewest())
    .map(date => date.getFullYear());

  const slider = document.querySelector(containerSelector + " .slider");

  noUiSlider.create(slider, {
    start: [possibleYears[0], possibleYears[possibleYears.length - 1]],
    connect: true,
    step: 1,
    range: {
      min: possibleYears[0],
      max: possibleYears[possibleYears.length - 1]
    },
    pips: {
      mode: "values",
      values: possibleYears,
      format: { to: num => num, from: str => parseInt(str) }
    }
  });

  slider.noUiSlider.on("change", yearsChosen => {
    const yearsArr = d3.range(yearsChosen[0], yearsChosen[1] + 1, 1);
    const newData = data.filterYears(yearsArr);
    createBars(newData, containerSelector);
    createWeekdaysChart(newData, containerSelector);
    createHourChart(newData, containerSelector);
    createFriendsDailyChart(newData, containerSelector);
  });
}

function cleanConvSection(data) {
  const containerSelector = ".conversation-section";
  const cont = d3.select(containerSelector);
  d3.select(".legend-name-participant").text(data.getParticipantName());
  if (document.querySelector(containerSelector + " .slider").hasChildNodes()) {
    document.querySelector(containerSelector + " .slider").noUiSlider.destroy();
  }
  cont.selectAll(".timeline-chart-container *").remove();
  d3.selectAll(
    containerSelector +
      " .message-box-user, " +
      containerSelector +
      " .message-box"
  ).remove();
  d3.select(containerSelector + " .conversation-box")
    .insert("div", ".load-next")
    .attr("class", "message-box-user empty-state-message")
    .text("Tutaj pojawią się Wasze wiadomości, gdy klikniesz na oś czasu.");
  cont.select(".conversation-name-text").text(data.getParticipantName());
}
