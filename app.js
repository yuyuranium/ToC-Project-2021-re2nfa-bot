const express = require('express');
const dotenv = require('dotenv');
const linebot = require('linebot');
const reParser = require('./util/re-parser');
const visualize = require('javascript-state-machine/lib/visualize');
const { CliRenderer } = require('@diagrams-ts/graphviz-cli-renderer');

const PORT = 6459;

dotenv.config();

const app = express();
const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

const render = CliRenderer({ outputFile: 'test.png', format: 'png' });

bot.on('message', async (event) => {
  try {
    let { nfa, fsm } = reParser.compile(event.message.text);

    let dotScript = visualize(fsm, { orientation: 'horizontal' })
    await render(dotScript);

    let reply = '';
    for (edge of nfa.edges) {
      reply += `${edge.from} -${edge.name}> ${edge.to}\n`;
    }
    event.reply(reply.slice(0, -1));
  } catch (e) {
    console.log(e);
    event.reply(reParser.getErrorMessage(e));
  }
});

app.post('/', bot.parser());

app.listen(PORT);
console.log(`Listening on port ${PORT}`);
