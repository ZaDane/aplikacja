export default function createFriendsDailyChart(data, containerSelector) {
  if (!d3.select(containerSelector + " .friends-daily-icon").empty()) {
    let peopleByDay = data
      .byInterval(d3.timeDay)
      .map(day => data.byPeople(day.msgs));
    const peoplePerDay = d3.mean(peopleByDay, day => day.length);

    const icons = d3.select(containerSelector + " .friends-daily-icon");

    d3.select(".friends-daily-num").text(Math.round(peoplePerDay * 100) / 100);
    if (peoplePerDay <= 5) {
      icons
        .transition()
        .duration(400)
        .style("width", peoplePerDay * 75 + "px")
        .style("height", "75px")
        .style("background-size", "75px 75px");
    } else if (peoplePerDay <= 10) {
      icons
        .transition()
        .duration(400)
        .style("width", peoplePerDay * 50 + "px")
        .style("height", "50px")
        .style("background-size", "50px 50px");
    } else if (peoplePerDay > 10) {
      icons
        .transition()
        .duration(400)
        .style("width", 10 * 50 + "px")
        .style("height", "50px")
        .style("background-size", "50px 50px");
    }
  }
}
