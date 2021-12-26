/**
 * # This is a bottom-up parser for simple regular expression.
 *
 * # The SLR(1) grammar of simple Re taught in ToC course.
 *
 *   0.               Re = OrExpr
 *
 *   1. (Or)      OrExpr = OrExpr '+' ConcatExpr
 *   2.                  | ConcatExpr
 *
 *   3. (Cc)  ConcatExpr = ConcatExpr PostfixExpr
 *   4.                  | PostfixExpr
 *
 *   5. (Pf) PostfixExpr = PrimExpr '*'
 *   6.                  | PrimExpr
 *
 *   7. (Pr)    PrimExpr = 'e'
 *   8.                  | '(' OrExpr ')'
 *
 *      tokens = ['+', '*', '(', ')', 'e', '$']
 *
 *      'e' is a simple character of [a-zA-Z0-9]
 *
 *
 * # LR parse table for the above grammar
 *
 * State    '+'   '*'   'e'   '('   ')'   '$'    Re    Or    Cc    Pf    Pr
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
 * s<k>: shifting a tokens from input token stream, pushing it onto stack, and 
 *       transitioning to state <k>.
 *
 * r<k>: applying grammar rule <k> on top of stack, prepending the reduced
 *       variable back to the input token stream.
 */
const StateMachine = require('javascript-state-machine');
const visualize = require('javascript-state-machine/lib/visualize');

let nonTerminals = [
    'Or', 'Cc', 'Pf', 'Pr'
];

let terminals = [
    '+', '*', '(', ')', '$'
];

class ReParser {
    // @TODO global state counter for construction nfa
    // @TODO using stack to push sub-nfa's
    constructor() {
        this.stack = [];
        this.input = [];
        this.dpda = new StateMachine({
            init: 'S0',
            transitions: [
                { name: '+', from: [ 'S1', 'S10' ], to: 'S7' },
                { name: '*', from: [ 'S4' ], to: 'S9' },
                { name: 'e', from: [ 'S0', 'S2', 'S6', 'S7', 'S11' ], to: 'S5' },
                { name: '(', from: [ 'S0', 'S3', 'S6', 'S7', 'S11' ], to: 'S6' },
                { name: ')', from: [ 'S10' ], to: 'S12' },
                { name: 'Or', from: [ 'S0' ], to: 'S1' },
                { name: 'Or', from: [ 'S6' ], to: 'S10' },
                { name: 'Cc', from: [ 'S0', 'S6' ], to: 'S2' },
                { name: 'Cc', from: [ 'S7' ], to: 'S11' },
                { name: 'Pf', from: [ 'S0', 'S6', 'S7' ], to: 'S3' },
                { name: 'Pf', from: [ 'S2', 'S11' ], to: 'S8' },
                { name: 'Pr', from: [ 'S0', 'S2', 'S6', 'S7', 'S11' ], to: 'S4' },
            ],
            data: {
                reduceRule: [

                ]
            },
            methods: {
                canShift: () => {
                    return 0;
                },
                canReduce: () => {
                    return 0;
                }
            }
        });
    }

    setInput(re) {
        this.input = re.split('');
        this.input.push('$');
        console.log('Input set:', this.input);
    }

    next() {
        if (this.input.length == 0) return null;

        let token = this.input[0];  // Peek top of input stream
        if (token.match(/[a-zA-Z0-9]/)) {
            return 'e';
        } else if (nonTerminals.includes(token) || terminals.includes(token)) {
            return token;
        } else {
            return null;
        }
    }

    shift() {
        return this.input.shift();
    }

    dumpParserDpda() {

    }
}

module.exports = ReParser;
