const express = require('express');
const dotenv = require('dotenv');
const linebot = require('linebot');
const ReParser = require('./util/re-parser');

const PORT = 6459;

dotenv.config();

const app = express();
const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

bot.on('message', (event) => {
  let reParser = new ReParser;
  let result = reParser.compile(event.message.text);
  event.reply((result)? 'It is an RE' : 'Not an RE');
});

app.post('/', bot.parser());

app.listen(PORT);
console.log(`Listening on port ${PORT}`);
