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

Array.prototype.random = function() {
  return this[Math.floor((Math.random() * this.length))];
}

const ControlFsm = StateMachine.factory({
  init: 'initial',
  transitions: [
    { name: 're2nfa', from: '*', to: 'waitingReInput' },
    { name: 'help', from: '*', to: 'waitingHelpType' },
    { name: 'reInput', from: 'waitingReInput', to: 'hasReInput' },
    { name: 'regret', from: 'hasReInput', to: 'waitingReInput' },
    { name: 'correctReInput', from: 'hasReInput', to: 'gotNfa' },
    { name: 'incorrectReInput', from: 'hasReInput', to: 'waitingReInput' },
    { name: 'match', from: 'gotNfa', to: 'waitingStringToMatch' },
    { name: 'retry', from: 'gotNfa', to: 'waitingReInput' },
    { name: 'restart', from: '*', to: 'initial' },
    { name: 'stringToMatch', from: 'waitingStringToMatch', to: 'gotNfa' },
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
  let profile = await event.source.profile();

  if (!user) {
    // Make a new active user.
    user = {
      id: event.source.userId,
      fsm: new ControlFsm(),
      opt: false,
      input: ''
    }

    // See which action had been selected by user.
    switch (data.action) {
      case 're2nfa':
        // Check if user want to do optimization.
        user.opt = data.opt === 'true';  

        let reply =
            `${messages.askForReInput}${(user.opt)? '🚀' : ''}\n` +
            `${messages.hint}`;
        event.reply(reply);
        break;
      case 'help':
        event.reply('No help yet');
        break;
      default:
        // May be 'match', 'retry' or 'restart' but user is not active.
        // So just push the main menu to user.
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

    user.fsm[data.action]();  // do the transition
    activeUsers.push(user);
    return;
  }

  // User is currently in the active user list and there is a transition from
  // current state, which means it is a valid operation.
  if (user.fsm.can(data.action)) {
    switch (data.action) {
      case 're2nfa':  // from main menu (initial state)
        user.opt = data.opt === 'true';  
      case 'retry':   // from nfa generated (gotNfa state)
        let reply =
            `${messages.askForReInput}${(user.opt)? '🚀' : ''}\n` +
            `${messages.hint}`;
        event.reply(reply);
        break;
      case 'help':
        event.reply('No help yet');
        break;
      case 'match':
        event.reply(askForStringToMatch);
        break;
      case 'restart':
        // Remove the user from active user list and push main menu to him/her.
        event.reply([
          {
            type: 'text',
            text: messages.selectFollowing
          },
          messages.mainMenu
        ]);
        activeUsers = activeUsers.filter(u => u.id !== user.id);
        return;
      default:
        return;  // do nothing
    }
    user.fsm[data.action]();  // do the transition
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

  // Only text message is accepted
  if (event.message.type !== 'text') {
    let reply = [messages.didNotGetIt.random()];
    switch (user.fsm.state) {
      case 'waitingHelpType':
        reply.push(`Please select a help type!`);
        break;
      case 'waitingReInput':
        reply.push(`${messages.askForReInputAgain}${(user.opt)? ' 🚀' : ''}`);
        break;
      case 'waitingStringToMatch':
        reply.push(`${messages.askForStringToMatch}`);
        break;
      default:
    }
    event.reply(reply);
    return;
  }

  let input = event.message.text;

  // User is currently in the active user list.
  switch (user.fsm.state) {
    case 'waitingReInput':
      user.input = input.trim();
      event.reply([
        {
          type: 'text',
          text: `💡 You entered: ${user.input}`
        },
        messages.confirmReInputTemplate
      ]);
      user.fsm.reInput();
      break;
    case 'hasReInput':
      if (input === 'no') {
        event.reply(`${messages.askForReInput}${(user.opt)? ' 🚀' : ''}`);
        user.fsm.regret();
        return;
      } else if (input !== 'yes') {
        // Don't know what user say, ask from confirmation again.
        event.reply([
          messages.didNotGetIt.random(),
          messages.confirmReInputTemplate
        ]);
        return;
      }

      // User said yes.
      try {
        // Try compiling the RE.
        let nfa = reCompiler.compile(user.input, optimize=user.opt);

        // Once success, get the dot script from nfa for plotting.
        await render(nfa.getDotScript());

        // Wait for uploading the image to imgur.
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

        // The user can proceed to the next state.
        user.fsm.correctReInput();
      } catch (e) {
        console.log(e);
        // @todo rander error message
        let errorMessage = reCompiler.getErrorMessage(e);

        // Something went wrong, ask for RE input again
        let reply = [
          (errorMessage)? errorMessage : e,
          `${messages.askForReInputAgain}${(user.opt)? ' 🚀' : ''}`
        ]
        event.reply(reply);
        user.fsm.incorrectReInput();
      }
      break;
    case 'waitingStringToMatch':
      break;
    default:
      break;
  }
});

app.post('/', bot.parser());
app.get('/active_users', (_req, res) => {
  res.send(activeUsers.map(u => {
    return {
      id: u.id,
      state: u.fsm.state,
      opt: u.opt
    };
  }));
});

app.listen(PORT);
console.log(`Listening on port ${PORT}`);
