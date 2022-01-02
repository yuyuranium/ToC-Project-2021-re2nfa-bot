const express = require('express');
const dotenv = require('dotenv');
const linebot = require('linebot');
const { CliRenderer } = require('@diagrams-ts/graphviz-cli-renderer');
const axios = require('axios')
const fs = require('fs');
const queryString = require('query-string');
const StateMachine = require('javascript-state-machine');
const reCompiler = require('./lib/re-compiler');
const msgSet = require('./msg-set.json');
const visualize = require('javascript-state-machine/lib/visualize');

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
    { name: 'askForReHelp', from: 'waitingHelpType', to: 'waitingHelpType' },
    { name: 'askForFsm', from: 'waitingHelpType', to: 'waitingHelpType' },
    { name: 'askForParserCfsm', from: 'waitingHelpType', to: 'waitingHelpType' },
    { name: 'reInput', from: 'waitingReInput', to: 'hasReInput' },
    { name: 'regret', from: 'hasReInput', to: 'waitingReInput' },
    { name: 'correctReInput', from: 'hasReInput', to: 'gotNfa' },
    { name: 'incorrectReInput', from: 'hasReInput', to: 'waitingReInput' },
    { name: 'match', from: 'gotNfa', to: 'waitingStringToMatch' },
    { name: 'askForDiagram', from: 'gotNfa', to: 'gotNfa' },
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
      `${msgSet.greeting[1]} ${profile.displayName}, ${msgSet.whoami}\n\n` + 
      `${msgSet.intro}`;
  try {
    event.reply([
      {
        type: 'text',
        text: welcomeMessage
      },
      {
        type: 'text',
        text: msgSet.tryFollowing
      },
      msgSet.mainMenu
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
            `${msgSet.askForReInput}${(user.opt)? msgSet.optSymbol : ''}\n` +
            `${msgSet.hint}`;
        event.reply(reply);
        break;
      case 'help':
        event.reply(msgSet.helpMenu);
        break;
      default:
        // May be 'match', 'retry' or 'restart' but user is not active.
        // So just push the main menu to user.
        event.reply([
          {
            type: 'text',
            text: `${msgSet.greeting.random()} ${profile.displayName} ` +
                  msgSet.selectFollowing
          },
          msgSet.mainMenu
        ]);
        return;  // don't add user to active user list
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
            `${msgSet.askForReInput}${(user.opt)? msgSet.optSymbol : ''}\n` +
            `${msgSet.hint}`;
        event.reply(reply);
        break;
      case 'help':
        // Remove the user from active user list and push help message to her.
        event.reply(msgSet.helpMenu);
        break;
      case 'match':
        event.reply(msgSet.askForStringToMatch);
        break;
      case 'restart':
        // Remove the user from active user list and push main menu to him/her.
        event.reply([
          {
            type: 'text',
            text: msgSet.selectFollowing
          },
          msgSet.mainMenu
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
        text: `${msgSet.greeting.random()} ${profile.displayName} ` +
              msgSet.selectFollowing
      },
      msgSet.mainMenu
    ]);
    return;
  }

  // Only text message is accepted
  if (event.message.type !== 'text') {
    let reply = [msgSet.didNotGetIt.random()];
    switch (user.fsm.state) {
      case 'waitingHelpType':
        reply.push(`Please select a help type!`);
        break;
      case 'waitingReInput':
        reply.push(
            `${msgSet.askForReInputAgain}${(user.opt)? msgSet.optSymbol : ''}`);
        break;
      case 'waitingStringToMatch':
        reply.push(
            `${msgSet.askForStringToMatch}`);
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
          text: `${msgSet.confirmPrefix} ${user.input}`
        },
        msgSet.confirmReInputTemplate
      ]);
      user.fsm.reInput();
      break;
    case 'hasReInput':
      if (input === 're-enter') {
        event.reply(
            `${msgSet.askForReInput}${(user.opt)? msgSet.optSymbol : ''}`);
        user.fsm.regret();
        return;
      } else if (input !== 'correct') {
        // Don't know what user say, ask from confirmation again.
        event.reply([
          msgSet.didNotGetIt.random(),
          msgSet.confirmReInputTemplate
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
        let menu = msgSet.onNfaGeneratedMenu;
        menu.template.thumbnailImageUrl = res.data.link;
        event.reply([
          {
            type: 'text',
            text: `${msgSet.onNfaGenerated.random()}`
          },
          menu
        ]);

        user.nfa = nfa;  // add nfa to user's field
        user.nfaUrl = res.data.link;  // add link of the diagram of the nfa also

        // The user can proceed to the next state.
        user.fsm.correctReInput();
      } catch (e) {
        let errorMessage = reCompiler.getErrorMessage(e);

        // Something went wrong, ask for RE input again
        event.reply([
          (errorMessage)? errorMessage : e,
          `${msgSet.askForReInputAgain}${(user.opt)? msgSet.optSymbol : ''}`
        ]);
        user.fsm.incorrectReInput();
      }
      break;
    case 'gotNfa':
      if (input === 'get me the diagram') {
        event.reply([
          {
            type: 'text',
            text: `${msgSet.onGetDiagram.random()}`
          },
          {
            type: 'image',
            originalContentUrl: user.nfaUrl,
            previewImageUrl: user.nfaUrl
          },
        ]);
        user.fsm.askForDiagram();
      } else {
        let menu = msgSet.onNfaGeneratedMenu;
        menu.template.thumbnailImageUrl = user.nfaUrl;
        event.reply([
          msgSet.didNotGetIt.random(),
          menu
        ]);
      }
      break;
    case 'waitingStringToMatch':
      let menu = msgSet.onNfaGeneratedMenu;
      menu.template.thumbnailImageUrl = user.nfaUrl;
      event.reply([
        user.nfa.match(input)? msgSet.onInputMatch : msgSet.onInputNotMatch,
        menu
      ]);
      user.fsm.stringToMatch();
      break;
    case 'waitingHelpType':
      switch (input) {
        case 'show me RE':
          event.reply(msgSet.reExplained);
          user.fsm.askForReHelp();
          break;
        case 'get me control FSM diagram':
          event.reply([
            msgSet.onGetDiagram.random(),
            {
              type: 'image',
              originalContentUrl: msgSet.controlFsmDiagram,
              previewImageUrl: msgSet.controlFsmDiagram
            }
          ]);
          user.fsm.askForFsm();
          break;
        case 'get me RE parser CFSM diagram':
          event.reply([
            msgSet.onGetDiagram.random(),
            {
              type: 'image',
              originalContentUrl: msgSet.reParserCfsmDiagram,
              previewImageUrl: msgSet.reParserCfsmDiagram
            }
          ]);
          user.fsm.askForParserCfsm();
          break;
        default:
          event.reply([
            msgSet.didNotGetIt.random(),
            msgSet.helpMenu
          ]);
          break;
      }
      break;
    default:
      // This may not happen.
      event.reply([
        msgSet.didNotGetIt.random(),
        msgSet.mainMenu
      ]);
      break;
  }
});

app.post('/', bot.parser());

app.get('/active_users', (_req, res) => {
  res.send(activeUsers.map(u => {
    return {
      id: u.id,
      state: u.fsm.state,
      opt: u.opt,
      nfa: u.nfaUrl
    };
  }));
});

app.get('/ctrl_fsm', async (_req, res) => {
  res.send(`<script>location.replace(${msgSet.controlFsmDiagram})</script>`);
});

app.listen(PORT);
console.log(`Listening on port ${PORT}`);
