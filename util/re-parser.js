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
 *       transitioning to state <k>.
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
  '+', '*', '(', ')', '$'
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

class ReParser {
  // @TODO global state counter for construction nfa
  // @TODO using stack to push sub-nfa's

  // Private variables
  #stack;
  #input;
  #cfsm;

  constructor() {
    this.#stack = [];
    this.#input = [];
    this.#cfsm = new StateMachine({
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
      ],
      data: {
        reductions: [
          { state: 'S2', peek: ['+', ')', '$'], rule: 2 },
          { state: 'S3', peek: ['+', 'e', '(', ')', '$'], rule: 4 },
          { state: 'S4', peek: ['+', 'e', '(', ')', '$'], rule: 6 },
          { state: 'S5', peek: ['+', '*', 'e', '(', ')', '$'], rule: 7 },
          { state: 'S8', peek: ['+', 'e', '(', ')', '$'], rule: 3 },
          { state: 'S9', peek: ['+', 'e', '(', ')', '$'], rule: 5 },
          { state: 'S11', peek: ['+', ')', '$'], rule: 1 },
          { state: 'S12', peek: ['+', '*', 'e', '(', ')', '$'], rule: 8 },
        ]
      },
      // @TODO remove the methods
      methods: {
        canShift: (symbol) => {
          return this.#cfsm.can(symbol);
        },
        canReduce: (symbol) => {
          let cfsm = this.#cfsm;
          let reduction = cfsm.reductions.find(r => r.state === cfsm.state);
          return (reduction)? reduction.peek.includes(symbol) : false;
        },
        canAccept: (symbol) => {
          return this.#cfsm.state === 'S1' && symbol === '$';
        },
        reductionRule: (symbol) => {
          let cfsm = this.#cfsm;
          let reduction = cfsm.reductions.find(
              r => (r.state === cfsm.state) && (r.peek.includes(symbol)));
          return reduction.rule;
        }
      }
    });
  }

  compile(re) {
    this.setInput(re);

    let accept = false;
    let stack = this.#stack;
    let cfsm = this.#cfsm;
    let input = this.#input;
    let step = 0;

    stack.push({ symbol: null, state: 'S0' });
    while (!accept) {
      console.log('\n', step, ':', stack, input);
      let nextSymbol = this.peek();
      if (cfsm.canShift(nextSymbol)) {
        cfsm[nextSymbol]();  // transition to next state;
        stack.push({ 
          symbol: input.shift(),
          state: cfsm.state
        });
        console.log('can shift', cfsm.state);

        if (cfsm.canAccept(this.peek())) {
          accept = true;
        }
      } else if (cfsm.canReduce(nextSymbol)) {
        let rule = GrammarRules[cfsm.reductionRule(nextSymbol)];
        for (let i = 0; i < rule.rhs.length; ++i)
          stack.pop();

        input.unshift(rule.lhs);
        console.log('can reduce', rule.lhs, '->', rule.rhs);
        cfsm.goto(stack[stack.length - 1].state);
      } else {
        console.log('parser error');
        return false;
      }
      step++;
    }
    return true;
  }

  test() {
    let cfsm = this.#cfsm;
    cfsm['pr']();
    console.log(cfsm);
    cfsm.goto('S11');
    cfsm.canReduce('+');
  }

  setInput(re) {
    re.replace(/\s/g, '');       // remove whitespaces from re
    this.#input = re.split('');  // separate all characters in re
    this.#input.push('$');
  }

  peek() {
    if (this.#input.length == 0) return null;

    let symbol = this.#input[0];  // peek top of input stream
    if (symbol.match(/^[a-zA-Z0-9]$/)) {
      return 'e';
    } else if (NonTerminals.includes(symbol) || Terminals.includes(symbol)) {
      return symbol;
    } else {
      return null;
    }
  }

  shift() {
    return this.#input.shift();
  }
}

module.exports = ReParser;
