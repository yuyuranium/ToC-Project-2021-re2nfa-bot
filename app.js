const express = require('express');
const dotenv = require('dotenv');
const linebot = require('linebot');
const { CliRenderer } = require('@diagrams-ts/graphviz-cli-renderer');
const axios = require('axios')
const fs = require('fs');
const queryString = require('query-string');
const StateMachine = require('javascript-state-machine');
const reCompiler = require('./lib/re-compiler');
const messages = require('./messages.json');

const PORT = 6459;
const OUTPUT_FILE = '/tmp/output.png';

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

Array.prototype.random = function () {
  return this[Math.floor((Math.random() * this.length))];
}

const ControlFsm = StateMachine.factory({
  init: 'initial',
  transitions: [
    { name: 're2nfa', from: '*', to: 'waitingReInput' },
    { name: 'help', from: '*', to: 'waitingHelpType' },
    { name: 'correctReInput', from: 'waitingReInput', to: 'gotNfa' },
    { name: 'incorrectReInput', from: 'waitingReInput', to: 'waitingReInput' },
    { name: 'match', from: 'gotNfa', to: 'waitingStringToMatch' },
    { name: 'tryAnother', from: 'gotNfa', to: 'waitingReInput' },
    { name: 'restart', from: 'gotNfa', to: 'initial' },
    { name: 'goto', from: '*', to: (s) => { return s; } }
  ]
});

dotenv.config();

const render = CliRenderer({ outputFile: OUTPUT_FILE, format: 'png' });

const app = express();

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

let activeUsers = [];

bot.on('follow', async (event) => {
  let profile = await event.source.profile();
  let welcomeMessage =
      `${messages.greeting[1]} ${profile.displayName}, ${messages.whoami}\n\n` + 
      `${messages.intro}`;
  try {
    event.reply([
      {
        type: 'text',
        text: welcomeMessage
      },
      {
        type: 'text',
        text: messages.tryFollowing
      },
      messages.mainMenu
    ]);
  } catch (e) {
    console.log(e);
  }
});

bot.on('postback', async (event) => {
  let data = queryString.parse(event.postback.data);
  let user = activeUsers.find(u => u.id === event.source.userId);

  if (!user) {
    // See which action had been selected by user.
    switch (data.action) {
      case 're2nfa':
        // Check if user want to do optimization.
        user.opt = data.opt === 'true';  

        let reply =
            `${messages.askForReInput[0]}${(user.opt)? '🚀' : ''}\n` +
            `${messages.askForReInput[1]}`;
        event.reply(reply);
        break;
      case 'help':
        event.reply('No help yet');
        break;
      default:
        // May be 'match', 'retry' or 'restart'.
        event.reply([
          {
            type: 'text',
            text: `${messages.greeting.random()} ${profile.displayName} ` +
                  messages.selectFollowing
          },
          messages.mainMenu
        ]);
        return;  // ask for a main menu option
    }

    // Make a new active user.
    user = {
      id: event.source.userId,
      fsm: new ControlFsm(),
      opt: false,
      input: ''
    }

    console.log('new:', user);
    activeUsers.push(user);

    user.fsm[data.action]();  // do the transition
  } else {
    // User is currently in the active user list, so go to wherever they want.
    console.log('old:', user);
  }
});

bot.on('message', async (event) => {
  let user = activeUsers.find(u => u.id === event.source.userId);

  if (!user) {
    // The user is not currently in the active user list.
    let profile = await event.source.profile();
    event.reply([
      {
        type: 'text',
        text: `${messages.greeting.random()} ${profile.displayName} ` +
              messages.selectFollowing
      },
      messages.mainMenu
    ]);
    return;
  }

  // User is currently in the active user list.
  switch (user.fsm.state) {
    case 'waitingReInput':
      if (event.message.type !== 'text') {
        event.reply(messages.notTextMessage.random());
        user.fsm.incorrectReInput();
        return;
      }

      user.input = event.message.text;
      try {
        let fsm = reCompiler.compile(user.input, optimize=user.opt);

        let dotScript = reCompiler.getDotScript(fsm);
        await render(dotScript);

        let res = await upload2Imgur(OUTPUT_FILE);
        event.reply([
          {
            type: 'text',
            text: `${messages.onNfaGenerated.random()}`
          },
          {
            type: 'image',
            originalContentUrl: res.data.link,
            previewImageUrl: res.data.link
          },
          messages.onNfaGeneratedMenu
        ]);
        user.fsm.correctReInput();
      } catch (e) {
        console.log(e);
        let errorMessage = reCompiler.getErrorMessage(e);

        // Something went wrong, ask for RE input again
        let reply = [
          (errorMessage)? errorMessage : e,
          `${messages.askForReInputAgain[0]}${(user.opt)? '🚀' : ''}`
        ]
        event.reply(reply);
        user.fsm.incorrectReInput();
      }
      break;
    case 'onNfaGenerated':
      break;
    default:
      break;
  }
});

app.post('/', bot.parser());

app.listen(PORT);
console.log(`Listening on port ${PORT}`);
