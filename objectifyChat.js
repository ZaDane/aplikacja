function getDate(dateStr) {
  const year = dateStr.slice(6, 10);
  const month = parseInt(dateStr.slice(3, 5)) - 1;
  const date = dateStr.slice(0, 2);
  const hour = dateStr.slice(12, 14);
  const min = dateStr.slice(15, 17);
  const d = new Date(year, month, date, hour, min, 0);
  return d instanceof Date && isFinite(d) ? d : false;
}

function getUser(msg) {
  const endIndex = msg.slice(20).indexOf(":");
  if (endIndex >= 0) {
    return msg.slice(20, endIndex + 20);
  }
  return false;
}

export function objectifyWhatsAppChat(chat) {
  const chatArr = chat.split("\n");
  let users = [];
  let lastSenderName;
  chatArr.forEach(msg => {
    const date = getDate(msg);
    const senderName = getUser(msg);
    if (!date && lastSenderName) {
      // continuation of the last message
      const sender = users.find(user => user.name === lastSenderName);
      sender.msgs[sender.msgs.length - 1].text += " " + msg;
    } else if (date && senderName) {
      const sender = users.find(user => user.name === senderName);
      // Add new user
      if (!sender) {
        users.push({
          name: senderName,
          msgs: []
        });
      }
      users
        .find(user => user.name === senderName)
        .msgs.push({
          text: msg,
          date: date
        });
      lastSenderName = senderName;
    }
  });
  return users;
}

export function objectifyFbChat(text) {
  const chatObj = JSON.parse(text);

  if (chatObj.thread_type !== "Regular") {
    return false;
  }
  let users = [
    { name: fixFacebookEncoding(chatObj.participants[0].name), msgs: [] },
    { name: fixFacebookEncoding(chatObj.participants[1].name), msgs: [] }
  ];
  chatObj.messages.forEach(msg => {
    if ("content" in msg) {
      users
        .find(user => user.name === fixFacebookEncoding(msg.sender_name))
        .msgs.push({
          text: fixFacebookEncoding(msg.content),
          date: new Date(msg.timestamp_ms)
        });
    }
  });

  return users;
}

const decoder = new TextDecoder("utf-8", { fatal: true });

function fixFacebookEncoding(text) {
  const codeArray = text.split("").map(char => char.charCodeAt(0));

  const byteArray = Uint8Array.from(codeArray);

  return decoder.decode(byteArray);
}

export function objectifyFbDirectory() {}
