/**
 * # This is a bottom-up parser for simple regular expression.
 *
 * # The SLR(1) grammar of simple Re taught in ToC course.
 *
 *   0.               Re = OrExpr
 *
 *   1. (or)      OrExpr = OrExpr '+' ConcatExpr
 *   2.                  | ConcatExpr
 *
 *   3. (cc)  ConcatExpr = ConcatExpr PostfixExpr
 *   4.                  | PostfixExpr
 *
 *   5. (pf) PostfixExpr = PrimExpr '*'
 *   6.                  | PrimExpr
 *
 *   7. (pr)    PrimExpr = 'e'
 *   8.                  | '(' OrExpr ')'
 *
 *      tokens = ['+', '*', '(', ')', 'e', '$']
 *
 *      'e' is a simple character of [a-zA-Z0-9]
 *
 *
 * # LR parse table for the above grammar
 *
 * State    '+'   '*'   'e'   '('   ')'   '$'    re    or    cc    pf    pr
 *     0                 s5    s6                      s1    s2    s3    s4
 *     1     s7                            acc                             
 *     2     r2          s5    s6    r2    r2                      s8    s4
 *     3     r4          r4    r4    r4    r4                              
 *     4     r6    s9    r6    r6    r6    r6                              
 *     5     r7    r7    r7    r7    r7    r7                              
 *     6                 s5    s6                      s10   s2    s3    s4
 *     7                 s5    s6                            s11   s3    s4
 *     8     r3          r3    r3    r3    r3                              
 *     9     r5          r5    r5    r5    r5                              
 *    10     s7                      s12                                   
 *    11     r1          s5    s6    r1    r1                      s8    s4
 *    12     r8    r8    r8    r8    r8    r8                             
 *
 * s<k>: shifting a symbol from input stream, pushing it onto stack, and 
 *       transitioning to state <k>. s<k> is part of the transitions in the cfsm
 *       (characteristic finite state machine).
 *
 * r<k>: applying grammar rule <k> on top of stack, prepending the reduced
 *       variable back to the input stream and go back to the state fo TOS.
 */
const StateMachine = require('javascript-state-machine');
const visualize = require('javascript-state-machine/lib/visualize');

const NonTerminals = [
  'or', 'cc', 'pf', 'pr'
];

const Terminals = [
  '+', '*', 'e', '(', ')', '$'
];

const GrammarRules = [
  { lhs: 're', rhs: [ 'or' ] },
  { lhs: 'or', rhs: [ 'or', '+', 'cc' ] },
  { lhs: 'or', rhs: [ 'cc' ] },
  { lhs: 'cc', rhs: [ 'cc', 'pf' ] },
  { lhs: 'cc', rhs: [ 'pf' ] },
  { lhs: 'pf', rhs: [ 'pr', '*' ] },
  { lhs: 'pf', rhs: [ 'pr' ] },
  { lhs: 'pr', rhs: [ 'e' ] },
  { lhs: 'pr', rhs: [ '(', 'or', ')' ] }
];

const Reductions = {
  'S1': { peek: ['$'], rule: 0 },
  'S2': { peek: ['+', ')', '$'], rule: 2 },
  'S3': { peek: ['+', 'e', '(', ')', '$'], rule: 4 },
  'S4': { peek: ['+', 'e', '(', ')', '$'], rule: 6 },
  'S5': { peek: ['+', '*', 'e', '(', ')', '$'], rule: 7 },
  'S8': { peek: ['+', 'e', '(', ')', '$'], rule: 3 },
  'S9': { peek: ['+', 'e', '(', ')', '$'], rule: 5 },
  'S11': { peek: ['+', ')', '$'], rule: 1 },
  'S12': { peek: ['+', '*', 'e', '(', ')', '$'], rule: 8 },
};

const cfsm = new StateMachine({
  init: 'S0',
  transitions: [
    { name: '+', from: ['S1', 'S10'], to: 'S7' },
    { name: '*', from: ['S4'], to: 'S9' },
    { name: 'e', from: ['S0', 'S2', 'S6', 'S7', 'S11'], to: 'S5' },
    { name: '(', from: ['S0', 'S2', 'S6', 'S7', 'S11'], to: 'S6' },
    { name: ')', from: ['S10'], to: 'S12' },
    { name: 'or', from: ['S0'], to: 'S1' },
    { name: 'or', from: ['S6'], to: 'S10' },
    { name: 'cc', from: ['S0', 'S6'], to: 'S2' },
    { name: 'cc', from: ['S7'], to: 'S11' },
    { name: 'pf', from: ['S0', 'S6', 'S7'], to: 'S3' },
    { name: 'pf', from: ['S2', 'S11'], to: 'S8' },
    { name: 'pr', from: ['S0', 'S2', 'S6', 'S7', 'S11'], to: 'S4' },
    { name: 'goto', from: '*', to: (s) => { return s; } }
  ]
});

const canShift = function(symbol) {
  return cfsm.can(symbol);
}

const canReduce = function(symbol) {
  let reduction = Reductions[cfsm.state];
  return (reduction)? reduction.peek.includes(symbol) : false;
}

const canAccept = function(symbol) {
  return cfsm.state === 'S1' && symbol === '$';
}

let stack = [];
let input = [];
let inputRe = '';
let cursor = 0;

const getSymbolNames = function(symbolList) {
  console.log(symbolList);
  let symbolNames = '';
  for (let i = 0; i < symbolList.length; ++i) {
    let symbol = symbolList[i];

    console.log(symbol);
    switch (symbol) {
      case 'or':
        symbolNames += 'OrExpr';
        break;
      case 'cc':
        symbolNames += 'ConcatExpr';
        break;
      case 'pf':
        symbolNames += 'PostfixExpr';
        break;
      case 'pr':
        symbolNames += 'PrimExpr';
        break;
      case 'e':
        symbolNames += '<char>';
        break;
      default:
        if (Terminals.includes(symbol)) {
          symbolNames += `'${symbol}'`;
        }
        break;
    }

    if (i != symbolList.length - 1) {
      symbolNames += '\n\t';
    }
  }
  return symbolNames;
}

const getHighlightedInput = function() {
  return [
    inputRe.slice(0, cursor),
    ' [', inputRe.slice(cursor, cursor + 1), '] ',
    inputRe.slice(cursor + 1)
  ].join('');
}

const setInput = function(reString) {
  input = reString.split(''); // separate all characters in re
  input.push('$');
  inputRe = reString;
  cursor = 0;
}

const peek = function() {
  if (input.length == 0) return null;

  let symbol = input[0];  // peek top of input stream
  if (symbol.match(/^[a-zA-Z0-9]$/)) {
    return 'e';
  } else if (NonTerminals.includes(symbol) || Terminals.includes(symbol)) {
    return symbol;
  } else {
    throw `**Unknown Token**\n\n` +
          `At input RE:${cursor + 1}:\n\t${getHighlightedInput()}`;
  }
}

const compile = function(reString) {
  let accept = false;
  let step = 0;

  setInput(reString);

  // Engine for the table driven SLR(1) parser
  stack = [];
  stack.push({ symbol: '', state: 'S0' });
  cfsm.goto('S0');

  let code = '';

  while (!accept) {
    let nextSymbol = peek()

    if (canShift(nextSymbol)) {
      cfsm[nextSymbol]();  // transition to next state;

      if (Terminals.includes(nextSymbol)) {
        cursor++;
      }

      let shifted = input.shift();
      stack.push({ 
        symbol: shifted,  // shift one symbol from input stream
        state: cfsm.state
      });

      if (canAccept(peek())) {
        accept = true;
      }
    } else if (canReduce(nextSymbol)) {
      let ruleIndex = Reductions[cfsm.state].rule;
      let rule = GrammarRules[ruleIndex];
      let symbol = '';
      for (let i = 0; i < rule.rhs.length; ++i) {
        symbol = stack.pop().symbol;
      }

      switch (ruleIndex) {
        case 1:
          code += 'Or ';
          console.log('Or');
          break;
        case 3:
          code += 'Cc ';
          console.log('Cc');
          break;
        case 5:
          code += 'Pf ';
          console.log('Pf');
          break;
        case 7:
          code += `'${symbol}' `;
          console.log(`'${symbol}' `);
        default:
          break;
      }

      input.unshift(rule.lhs);  // prepend the reduced symbol to input stream
      cfsm.goto(stack[stack.length - 1].state);
    } else {
      console.log(cfsm.state);
      let expected = cfsm.transitions().filter(t => t !== 'goto');
      if (Reductions[cfsm.state]) {
        expected = expected.concat(Reductions[cfsm.state].peek);
      }
      throw `**Parse Error**\n\n` +
            `At input RE:${cursor + 1}:\n\t${getHighlightedInput()}\n\n` +
            `Expected:\n\t${getSymbolNames(expected)}\n\n` +
            `got: '${nextSymbol}'`;
    }
    step++;
  }
  return code;
}

module.exports = {
  compile: compile
};
