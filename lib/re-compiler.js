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
        symbolNames += '[a-zA-Z0-9λ(^)]';
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
  if (symbol.match(/^[a-zA-Z0-9\^λ]$/)) {
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
        expected = [...expected, ...Reductions[cfsm.state].peek];
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
  push: (stack, _optimize) => {
    // This is a primitive regular expression. It looks like:
    // (nextId) --symbol--> (nextId + 1)

    // Look up the previous one's final state
    let tos = stack[stack.length - 1];
    let nextId = (tos)? tos.stateCount : 0;

    let init = { id: nextId };
    let final = { id: nextId + 1 };
    let symbol = ins.symbol, op = 'primitive';

    // To record whether this primitive is the lambda transition.
    if (ins.symbol === '^' || ins.symbol === 'λ') {
      symbol = 'λ';
      op = 'lambda';
    }

    let nfa = {
      init: init,
      final: final,
      states: [init, final],
      edges: [
        {
          name: symbol,
          from: init,
          to: final,
        }
      ],
      last: op,
      heading: op,
      trailing: op,
      stateCount: nextId + 2  // 2 states are added
    }
    stack.push(nfa);
  },
  union: (stack, optimize) => {
    // Do the union operation on the 2 nfa on the stack top.
    if (stack.length < 2) {
      throw {
        type: 'Stack Underflow',
        op: 'union'
      };
    }

    let y = stack.pop();
    let x = stack.pop();

    if (optimize) {
      if (x.last === 'kleene' && y.last === 'lambda') {
        stack.push(x);  // (r)*+λ is just (r)*
        return;
      } else if (x.last === 'lambda' && y.last === 'kleene') {
        y.states.forEach(s => s.id -= 2);  // 2 states ahead are to be removed
        stack.push(y);  // λ+(r)* is just (r)*
        return;
      } else if (x.last === 'lambda' && y.last === 'lambda') {
        stack.push(x);  // λ+λ is just λ
        return;
      }
    }

    x.states.forEach(s => s.id += 1);
    y.states.forEach(s => s.id += 1);

    let init = { id: x.init.id - 1 };
    let final = { id: y.stateCount + 1 };

    let edges = [], states = [];
    let stateCount = y.stateCount + 2;

    if (optimize) {
      // Considering 4 ports: to x.init, y.init, and from x.final, y.final
      if (x.heading != 'kleene') {
        // We can remove x.init.
        x.states.forEach(s => s.id -= 1);
        y.states.forEach(s => s.id -= 1);
        x.edges.filter(e => e.to === x.init).forEach(e => e.to = init);
        x.edges.filter(e => e.from === x.init).forEach(e => e.from = init);
        x.states = x.states.filter(s => s !== x.init);
        stateCount -= 1;
        final.id -= 1;
      } else {
        edges.push({
          name: 'λ',
          from: init,
          to: x.init
        });
      }

      if (x.trailing != 'kleene') {
        // We can remove x.final.
        y.states.forEach(s => s.id -= 1);
        x.edges.filter(e => e.to === x.final).forEach(e => e.to = final);
        x.edges.filter(e => e.from === x.final).forEach(e => e.from = final);
        x.states = x.states.filter(s => s !== x.final);
        stateCount -= 1;
        final.id -= 1;
      } else {
        edges.push({
          name: 'λ',
          from: x.final,
          to: final
        });
      }

      if (y.heading != 'kleene') {
        // we can remove y.init.
        y.states.forEach(s => s.id -= 1);
        y.edges.filter(e => e.to === y.init).forEach(e => e.to = init);
        y.edges.filter(e => e.from === y.init).forEach(e => e.from = init);
        y.states = y.states.filter(s => s !== y.init);
        stateCount -= 1;
        final.id -= 1;
      } else {
        edges.push({
          name: 'λ',
          from: init,
          to: y.init
        });
      }

      if (y.trailing != 'kleene') {
        // we can remove y.final.
        y.edges.filter(e => e.to === y.final).forEach(e => e.to = final);
        y.edges.filter(e => e.from === y.final).forEach(e => e.from = final);
        y.states = y.states.filter(s => s !== y.final);
        stateCount -= 1;
        final.id -= 1;
      } else {
        edges.push({
          name: 'λ',
          from: y.final,
          to: final
        });
      }
    } else {
      edges = [
        {
          name: 'λ',
          from: init,
          to: x.init
        },
        {
          name: 'λ',
          from: init,
          to: y.init
        },
        {
          name: 'λ',
          from: x.final,
          to: final
        },
        {
          name: 'λ',
          from: y.final,
          to: final
        }
      ];
    }

    edges = [...edges, ...x.edges, ...y.edges];
    states = [init, final, ...x.states, ...y.states];
    
    let nfa = {
      init: init,
      final: final,
      states: states,
      edges: edges,
      last: 'union',
      heading: 'union',
      trailing: 'union',
      stateCount: stateCount
    }
    stack.push(nfa);
  },
  concat: (stack, optimize) => {
    if (stack.length < 2) {
      throw {
        type: 'Stack Underflow',
        op: 'concat'
      };
    }

    let y = stack.pop();
    let x = stack.pop();

    if (optimize) {
      // If any of x or y is lambda, then we can simplify to the other.
      if (x.last === 'lambda') {
        // Reduce the id of all y's state by 2.
        y.states.forEach(s => s.id -= 2);
        stack.push(y);
        return;
      } else if (y.last === 'lambda') {
        stack.push(x);
        return;
      }
    }

    let final;
    let edges = [], states = [];
    let stateCount = y.stateCount;

    if (!(x.trailing === 'kleene' && y.heading === 'kleene')) {
      // We can optimize the concat operation by connecting all the states that
      // connect to x's final to y's init if both the trailing operation of x
      // and the heading operation of y are not 'kleene closure'.
        
      y.states.forEach(s => s.id -= 1);  // reduce the id of all y's state by 1

      y.edges.filter(e => e.from === y.init).forEach(e => e.from = x.final);
      y.edges.filter(e => e.to === y.init).forEach(e => e.to = x.final);
      edges = [...x.edges, ...y.edges];  // add all the edges of x and y

      // Exclude initial state of y.
      states = [...x.states, ...y.states.filter(s => s !== y.init)];
      stateCount -= 1;  // y.init has been removed

      // Consider that y's init is the same as final.
      final = (y.init === y.final)? x.final : y.final;
    } else {
      // Simply add a lambda transition from x.final to y.init
      edges = [
        {
          name: 'λ',
          from: x.final,
          to: y.init,
        },
        ...x.edges, ...y.edges
      ];
      states = [...x.states, ...y.states];  // add all the states of x and y
      final = y.final;
    }

    let nfa = {
      init: x.init,
      final: final,
      edges: edges,
      states: states,
      last: 'concat',
      heading: x.heading,
      trailing: y.trailing,
      stateCount: stateCount
    };
    stack.push(nfa);
  },
  kleene: (stack, optimize) => {
    if (stack.length < 1) {
      throw {
        type: 'Stack Underflow',
        op: 'kleene'
      };
    }

    let x = stack.pop();

    if (optimize && (x.last === 'lambda' || x.last === 'kleene')) {
      stack.push(x);  // λ* and (r*)* has no effect
      return;
    }

    let final;
    let edges = [], states = [];
    let stateCount = x.stateCount;

    if (optimize) {
      // We can simplify the kleene closure by connecting the final state of x
      // to its initial state.

      // Find all edges that connect from/to the final of x, redirect them to
      // the init of x.
      x.edges.filter(e => e.from == x.final).forEach(e => e.from = x.init);
      x.edges.filter(e => e.to == x.final).forEach(e => e.to = x.init);
      edges = x.edges;

      // Exclude the final state from x
      states = x.states.filter(s => s != x.final);
      final = x.init;
      stateCount -= 1;  // x.final has been removed
    } else {
      // Add the forward and backward lambda transitions.
      edges = [
        {
          name: 'λ',
          from: x.init,
          to: x.final,
          dot: { constraint: 'false' }
        },
        {
          name: 'λ',
          from: x.final,
          to: x.init,
          dot: { constraint: 'false' }
        },
        ...x.edges
      ];
      states = x.states;  // states unchanged
      final = x.final;
    }

    let nfa = {
      init: x.init,
      final: final,
      edges: edges,
      states: states,
      last: 'kleene',
      heading: 'kleene',
      trailing: 'kleene',
      stateCount: stateCount
    }
    stack.push(nfa);
  }
}

const buildNfaStateMachine = function(nfa) {
  let transitions = [];
  let final = [];
  for (edge of nfa.edges) {
    transitions.push({
      name: edge.name,
      from: `q${edge.from.id}`,
      to: `q${edge.to.id}`,
      dot: edge.dot
    })
  }

  for (state of nfa.final) {
    final.push(`q${state.id}`);
  }

  return new StateMachine({
    init: `q${nfa.init.id}`,
    transitions: transitions,
    data: {
      init: `q${nfa.init.id}`, 
      final: final
    }
  });
}

const generateNfa = function(code, optimize) {
  let stack = [];

  for (ins of code) {
    execute[ins.op](stack, optimize);
  }
  let nfa = stack[0];

  if (optimize) {
    // Remove redundent final states and allow multiple final states.
    let essential = [];
    let workList = [nfa.final];
    do {
      let qf = workList.shift();

      let edgesToQf = nfa.edges.filter(e => e.to === qf);
      let edgesFromQf = nfa.edges.filter(e => e.from === qf);

      if (edgesToQf.length > 0 && edgesFromQf.length == 0 &&
          edgesToQf.every(e => e.name === 'λ' && e.to !== e.from)) {
        // If every edges to qf are lambda and does not make a loop, then qf is
        // said to be 'redundent' and can be removed. Plus, there are no
        // transitions from qf.
        for (edge of edgesToQf) {
          // All the states that can transition to qf need to be checked again.
          if (!workList.includes(edge.from)) {
            workList.push(edge.from);  // avoid repeated states
          }

          // The edge can safely be removed.
          nfa.edges = nfa.edges.filter(e => e !== edge);
        }

        // qf can safely be removed.
        nfa.states = nfa.states.filter(s => s !== qf);
      } else if (!essential.includes(qf)) {
        essential.push(qf);  // qf is an essential final state
      }
    } while (workList.length > 0);
    nfa.final = essential;  // allow multiple final states

    // Remove (q) --λ--> (q)
    nfa.edges = nfa.edges.filter(e => !((e.name === 'λ') && (e.to === e.from)));

    // Remove repeadted edges: O(n^2)
    for (let i = 0; i < nfa.edges.length; ++i) {
      let e = nfa.edges[i];
      for (let j = i + 1; j < nfa.edges.length; ++j) {
        let f = nfa.edges[j];
        if (e.name === f.name &&
            e.to === f.to &&
            e.from == f.from) {
          nfa.edges.splice(j--, 1);
        }
      }
    }
  } else {
    // No optimizations.
    nfa.final = [nfa.final];  // transform to an array for consistency
  }

  return nfa;
}

const getDotScript = function(fsm) {
  let lines = visualize(fsm, { orientation: 'horizontal' }).split('\n');
  lines.splice(2, 0, `  "" [shape = none, width = 0.0]`);
  lines.splice(2, 0, `  "" -> ${fsm.init};`);
  lines.splice(2, 0, `  node [shape = circle, width = 1.0];`);
  for (state of fsm.final) {
    lines.splice(2, 0, `  node [shape = doublecircle, width = 0.9]; ${state};`);
  }
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

const compile = function(reString, optimize = false) {
  // Set the global variable: inputReString.
  inputReString = reString;

  // Tokenize the input to token stream.
  let tokenStream = buildTokenStream(reString);

  // Use parser driver to parse the token stream by the defined parse table and 
  // cfsm. Get the generated code of parsing result.
  let code = parserDriver(tokenStream);

  let nfa = generateNfa(code, optimize);
  let fsm = buildNfaStateMachine(nfa);
  return fsm;
}

module.exports = {
  compile, getErrorMessage, getDotScript
};
