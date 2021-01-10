/* eslint-disable no-restricted-syntax */
const fetch = require('node-fetch');

const { normalizeObjectToString } = require('../utils');

const telegramNotification = async (rawText) => {
  const text = normalizeObjectToString(rawText);
  const chatID = 291121392;
  const token = '1451595099:AAHBIzmA3Qng89-1bW-bpFQ390KQYndAxmE';

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatID}&text=\`\`\`\n${text}\`\`\`&parse_mode=MarkdownV2`);

  return res.json();
};

module.exports = {
  telegramNotification,
};
