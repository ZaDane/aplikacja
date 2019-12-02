export default function createDataSource(stats) {
  const allSorted = stats[0].msgs
    .map(msg => {
      return { ...msg, from: stats[0].name };
    })
    .concat(
      stats[1].msgs.map(msg => {
        return { ...msg, from: stats[1].name };
      })
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const oldest = allSorted[0].date.getTime();
  const newest = allSorted[allSorted.length - 1].date.getTime();

  const getUserName = () => stats[1].name;
  const getParticipantName = () => stats[0].name;
  const getUserMsgs = () => stats[1].msgs;
  const getParticipantMsgs = () => stats[0].msgs;

  const byPeople = (msgs = allSorted) =>
    d3
      .nest()
      .key(msg =>
        msg.sender ? msg.sender : msg.receiver ? msg.receiver : msg.from
      )
      .entries(msgs);

  const timeSlice = (start, end, msgs = allSorted) => {
    return msgs.filter(
      msg =>
        msg.date.getTime() <= end.getTime() &&
        msg.date.getTime() >= start.getTime()
    );
  };

  const peopleSlice = (people, msgs = allSorted) => {
    return byPeople(
      msgs.filter(msg =>
        people.includes(msg.sender ? msg.sender : msg.receiver)
      )
    );
  };

  const byInterval = (
    interval,
    msgs = allSorted,
    start = oldest,
    end = newest
  ) => {
    const range = interval.range(interval.floor(start), end);
    const split = [];
    range.forEach(int => {
      split.push({ time: int.getTime(), msgs: [] });
    });
    msgs.forEach(msg => {
      const dateFlored = interval.floor(msg.date).getTime();
      const foundInt = split.find(int => int.time == dateFlored);
      if (foundInt) {
        foundInt.msgs.push(msg);
      }
    });
    return split;
  };

  const countChars = (msgs, condFunction = () => true) =>
    d3.sum(
      msgs.filter(msg => condFunction(msg)),
      msg => msg.text.length
    );

  const filterYears = includedYears => {
    const newMsgsUser = getUserMsgs().filter(msg =>
      includedYears.includes(msg.date.getFullYear())
    );
    const newMsgsParticipant = getParticipantMsgs().filter(msg =>
      includedYears.includes(msg.date.getFullYear())
    );

    return createDataSource([
      { name: getParticipantName(), msgs: newMsgsParticipant },
      { name: getUserName(), msgs: newMsgsUser }
    ]);
  };

  const extractDataWithPerson = person => {
    return createDataSource([
      {
        name: person,
        msgs: getParticipantMsgs().filter(msg => msg.sender === person)
      },
      {
        name: getUserName(),
        msgs: getUserMsgs().filter(msg => msg.receiver === person)
      }
    ]);
  };

  const getStats = () => stats;
  const getAllSorted = () => allSorted;
  const getOldest = () => oldest;
  const getNewest = () => newest;

  return {
    getStats,
    getAllSorted,
    byPeople,
    peopleSlice,
    timeSlice,
    byInterval,
    countChars,
    getParticipantName,
    getUserName,
    getParticipantMsgs,
    getUserMsgs,
    getOldest,
    getNewest,
    filterYears,
    extractDataWithPerson
  };
}
