const express = require('express');
const dotenv = require('dotenv');
const linebot = require('linebot');
const reParser = require('./util/re-parser');
const visualize = require('javascript-state-machine/lib/visualize');
const { CliRenderer } = require('@diagrams-ts/graphviz-cli-renderer');
const axios = require('axios')
const fs = require('fs');

const PORT = 6459;
const OUTPUT_FILE = './db/tmp/output.png';

dotenv.config();

const render = CliRenderer({ outputFile: OUTPUT_FILE, format: 'png' });

const app = express();

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

const upload2Imgur = async function(filename) {
  try {
    let image = fs.readFileSync(filename, { encoding: 'base64' });
    let options = {
      'method': 'POST',
      'url': 'https://api.imgur.com/3/image',
      'headers': {
        'Authorization': `Client-ID ${process.env.CLIENT_ID}`
      },
      'data': {
        image: image
      }
    };
    let res = await axios(options);
    return res.data;
  } catch (e) {
    console.log(e);
  }
}

bot.on('message', async (event) => {
  try {
    let fsm = reParser.compile(event.message.text);

    let dotScript = reParser.getDotScript(fsm);
    await render(dotScript);

    let res = await upload2Imgur(OUTPUT_FILE);
    event.reply([
      {
        type: 'text',
        text: 'OK'
      },
      {
        type: 'image',
        originalContentUrl: res.data.link,
        previewImageUrl: res.data.link
      }
    ]);
  } catch (e) {
    console.log(e);
    event.reply(reParser.getErrorMessage(e));
  }
});

app.post('/', bot.parser());

app.listen(PORT);
console.log(`Listening on port ${PORT}`);
