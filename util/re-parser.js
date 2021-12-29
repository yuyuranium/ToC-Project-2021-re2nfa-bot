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

let inputReString = '';

const getSymbolNames = function(symbolList) {
  let symbolNames = '';
  for (let i = 0; i < symbolList.length; ++i) {
    let symbol = symbolList[i];

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
        symbolNames += '[a-zA-Z0-9]';
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

const highlight = function(input, position) {
  // Use brackets to highlight the position of input.
  return [
    input.slice(0, position),
    ' [', input.slice(position, position + 1), '] ',
    input.slice(position + 1)
  ].join('');
}

const buildTokenStream = function(reString) {
  let tokenStream = reString.split('');
  tokenStream.push('$');
  return tokenStream;
}

const peek = function(inputStream) {
  if (inputStream.length == 0) return null;

  let symbol = inputStream[0];  // peek top of input stream
  if (symbol.match(/^[a-zA-Z0-9]$/)) {
    return 'e';
  } else if (NonTerminals.includes(symbol) || Terminals.includes(symbol)) {
    return symbol;
  } else {
    return null;
  }
}

const parserDriver = function(tokenStream) {
  let accept = false;
  let stack = [];
  let input = tokenStream;
  let code = [];
  let cursor = 0;

  cfsm.goto('S0');                          // start from initial state
  stack.push({ symbol: '', state: 'S0' });  // push initial state to stack

  while (!accept) {
    let nextSymbol = peek(input);

    // The peeker could not recognize the upcoming symbol.
    if (!nextSymbol) {
      throw {
        type: 'Unknown Token',
        input: inputReString,
        position: cursor
      };
    }

    if (canShift(nextSymbol)) {
      // Transition to next state.
      cfsm[nextSymbol]();

      if (Terminals.includes(nextSymbol)) {
        cursor++;  // a token has been consumed
      }

      // Shift one symbol from input stream.
      let shifted = input.shift();

      // Push the current state onto stack.
      stack.push({ 
        symbol: shifted,
        state: cfsm.state
      });

      // Check if the next state is an accept state.
      accept = canAccept(peek(input));
    } else if (canReduce(nextSymbol)) {
      let rule = GrammarRules[Reductions[cfsm.state].rule];
      let symbol = '';

      // Pop # of rhs symbols from stack.
      for (let i = 0; i < rule.rhs.length; ++i) {
        symbol = stack.pop().symbol;
      }

      // Prepend the reduced symbol to input stream and go back to the state
      // of TOS.
      input.unshift(rule.lhs);
      cfsm.goto(stack[stack.length - 1].state);

      // Generate the code according to the rule applied.
      switch (rule) {
        case GrammarRules[1]:  // OrExpr = OrExpr '+' ConcatExpr
          code.push({ op: 'union' });
          break;
        case GrammarRules[3]:  // ConcatExpr = ConcatExpr PostfixExpr
          code.push({ op: 'concat' });
          break;
        case GrammarRules[5]:  // PostfixExpr = PrimExpr '*'
          code.push({ op: 'kleene' });
          break;
        case GrammarRules[7]:  // PrimExpr = 'e'
          code.push({ op: 'push', symbol: symbol });
        default:
          break;
      }
    } else {
      // Expected symbols are all the possible cfsm transitions.
      let expected = cfsm.transitions().filter(t => t !== 'goto');

      // Plus, symbols that can trigger reduction also count.
      if (Reductions[cfsm.state]) {
        expected = expected.concat(Reductions[cfsm.state].peek);
      }

      throw {
        type: 'Parse Error',
        input: inputReString,
        position: cursor,
        expected: expected,
        got: nextSymbol
      };
    }
  }
  return code;
}

const execute = {
  push: (stack) => {
    // This is a primitive regular expression. It looks like:
    // (nextId) --symbol--> (nextId + 1)

    // Look up the previous one's final state
    let tos = stack[stack.length - 1];
    let nextId = (tos)? tos.final.id + 1 : 0;

    let init = { id: nextId };
    let final = { id: nextId + 1 };
    let nfa = {
      init: init,
      final: final,
      states: [init, final],
      edges: [
        {
          name: ins.symbol,
          from: init,
          to: final,
          //dot: { headport: 'w', tailport: 'e' }
        }
      ],
      heading: 'primitive',
      trailing: 'primitive'
    }
    stack.push(nfa);
  },
  union: (stack) => {
    // Do the union operation on the 2 nfa on the stack top.
    if (stack.length < 2) {
      throw {
        type: 'Stack Underflow',
        op: 'union'
      };
    }

    let y = stack.pop();
    let x = stack.pop();

    x.states.forEach(s => s.id += 1);  // increase the id of all x's state by one
    y.states.forEach(s => s.id += 1);  // increase the id of all y's state by one

    /* Optimized
    y.states.map(s => s.id -= 2);
    */

    let init = { id: x.init.id - 1 };
    let final = { id: y.final.id + 1 };

    let edges = [
      {
        name: 'λ',
        from: init,
        to: x.init,
      },
      {
        name: 'λ',
        from: init,
        to: y.init,
      },
      {
        name: 'λ',
        from: x.final,
        to: final,
      },
      {
        name: 'λ',
        from: y.final,
        to: final,
      }
    ].concat(x.edges).concat(y.edges);
    let states = [init, final].concat(x.states).concat(y.states);
    
    // Optimized
    /*
    x.edges.filter(e => e.from === x.final).map(e => e.from = y.final);
    x.edges.filter(e => e.to === x.final).map(e => e.to = y.final);
    y.edges.filter(e => e.from === y.init).map(e => e.from = x.init);
    y.edges.filter(e => e.to === y.init).map(e => e.to = x.init);
    let edges = x.edges.concat(y.edges);
    let states = x.states.filter(s => s !== x.final).concat(y.states.filter(s => s !== y.init));
    */

    let nfa = {
      init: init,
      final: final,
      states: states,
      edges: edges,
      heading: 'union',
      trailing: 'union'
    }
    stack.push(nfa);
  },
  concat: (stack) => {
    if (stack.length < 2) {
      throw {
        type: 'Stack Underflow',
        op: 'concat'
      };
    }

    let y = stack.pop();
    let x = stack.pop();

    let edges = [];
    let states = [];

    if (!(x.trailing === 'kleene' && y.heading === 'kleene')) {
      // We can optimize the concat operation by connecting the final state of x
      // to all the states that the initial state of y connects to if both the
      // trailing operation of x and the heading operation of y are not
      // 'kleene closure'.
        
      y.states.forEach(s => s.id -= 1);  // reduce the id of all y's state by one

      y.edges.filter(e => e.from === y.init).forEach(e => e.from = x.final);
      y.edges.filter(e => e.to === y.init).forEach(e => e.to = x.final);

      // Exclude y's initial state
      states = x.states.concat(y.states.filter(s => s !== y.init));
      edges = x.edges.concat(y.edges);  // add all the edges of x and y
    } else {
      states = x.states.concat(y.states);  // add all the states of x and y
      edges = [
        {
          name: 'λ',
          from: x.final,
          to: y.init,
        }
      ].concat(x.edges).concat(y.edges);
   }

    let nfa = {
      init: x.init,
      final: y.final,
      states: states,
      edges: edges,
      heading: x.heading,
      trailing: y.trailing
    };
    stack.push(nfa);
  },
  kleene: (stack) => {
    if (stack.length < 1) {
      throw {
        type: 'Stack Underflow',
        op: 'kleene'
      };
    }

    let x = stack.pop();

    /* Optimized
    x.edges.filter(e => e.from == x.final).map(e => e.from = x.init);
    x.edges.filter(e => e.to == x.final).map(e => e.to = x.init);

    let states = x.states.filter(s => s != x.final);
    */

    let states = x.states;

    let nfa = {
      init: x.init,
      final: x.final,
      states: states,
      edges: [
        {
          name: 'λ',
          from: x.init,
          to: x.final,
          dot: { /*headport: 'n', tailport: 'n',*/ constraint: 'false' }
        },
        {
          name: 'λ',
          from: x.final,
          to: x.init,
          dot: { /*headport: 's', tailport: 's',*/ constraint: 'false' }
        }
      ].concat(x.edges),
      heading: 'kleene',
      trailing: 'kleene'
    }
    stack.push(nfa);
  }
}

const buildNfaStateMachine = function(nfa) {
  let transitions = [];
  for (edge of nfa.edges) {
    transitions.push({
      name: edge.name,
      from: `q${edge.from.id}`,
      to: `q${edge.to.id}`,
      dot: edge.dot
    })
  }

  return new StateMachine({
    init: `q${nfa.init.id}`,
    transitions: transitions,
    data: {
      final: `q${nfa.final.id}`
    }
  });
}

const generateNfa = function(code) {
  let stack = [];
  for (ins of code) {
    execute[ins.op](stack);
  }
  return stack[0];
}

const getDotScript = function(fsm) {
  let lines = visualize(fsm, { orientation: 'horizontal' }).split('\n');
  lines.splice(2, 0, `  "" [shape = none, width = 0.0]`);
  lines.splice(2, 0, `  "" -> "q0";`);
  lines.splice(2, 0, `  node [shape = circle];`);
  lines.splice(2, 0, `  node [shape = doublecircle]; ${fsm.final};`);
  return lines.join('\n');
}

const getErrorMessage = function(error) {
  switch (error.type) {
    case 'Unknown Token':
      return `**Unknown Token**\n\n` +
             `At input:${error.position + 1}:\n` +
             `\t${highlight(error.input, error.position)}`;
    case 'Parse Error':
      return `**Parse Error**\n\n` +
             `At input RE:${error.position + 1}:\n` +
             `\t${highlight(error.input, error.position)}\n\n` +
             `Expected:\n\t${getSymbolNames(error.expected)}\n\n` +
             `Got: '${error.got}'`;
    default:
      return null;
  }
}

const compile = function(reString) {
  // Set the global variable: inputReString.
  inputReString = reString;

  // Tokenize the input to token stream.
  let tokenStream = buildTokenStream(reString);

  // Use parser driver to parse the token stream by the defined parse table and 
  // cfsm. Get the generated code of parsing result.
  let code = parserDriver(tokenStream);

  let nfa = generateNfa(code);
  let fsm = buildNfaStateMachine(nfa);
  return fsm;
}

module.exports = {
  compile, getErrorMessage, getDotScript
};
