# ToC-RE-Helper

<p align="center">
  <img src="./img/re2nfa-icon.jpg" width="25%;" align="center"/>
</p>

## Intro

This is the final project for the course "**Theory of Computation**". The project aims to help those who are also participating this course but had a hard time understanding the concept of **regular expression** and **NFA** (non-deterministic finite automata).

The LINE bot **ToC-RE-Helper** would help you transform an **RE** you learned in the class into an equivalent **NFA**. Also, it is capable of performing optimization on your input to minimize the number of states and transitions. Finally, once the **NFA** is generated, you can try giving it an input string and see whether the **NFA** can accept it or not!

### Bot basic ID

- @846cqgxg

### QR code

<p style="text-align: center"><img src="./img/846cqgxg.png" width="25%"></p>

* Scan the QR code and add the bot **ToC-RE-Helper** official account as your friends.
* Select **RE to NFA** on the main menu to start crafting your **NFA**!
* If having trouble, you can see the **Help** content by clicking the help option on the main menu.

## Demo

### RE to NFA

<img src="./img/re2nfa-demo.gif" style="width: 30%; align: left"/>

* An intuitive and straightforward way of constructing an NFA from RE
* Easy to understand the structure of the NFA
* Has only one single final state

### RE to NFA (optimized)

<img src="./img/re2nfa-opt-demo.gif" style="width: 30%; align: left"/>

* Optimize the NFA generation of all kinds of regular expression operator
* Minimized number of states and transitions
* Has multiple final states


### Match

<img src="./img/nfa-match-demo.gif" style="width: 30%; align: left"/>

* You can use **Match** to test the NFA you crafted
* It tells you whether the input string you entered can be accept by the NFA or not

### Help

<img src="./img/help-demo.gif" style="width: 30%; align: left"/>

* A simple help page is provided to give you more information about NFA and RE
* It shows the relation of an RE expression between the corresponding NFA component
* You can also get the detailed control flow state machine diagram and the characteristic finite state machine diagram of RE parser in the help page

## Features

* Hand crafted regular expression compiler
* Stack based NFA generator
* NFA optimization for minimal states and transitions
* Same regular expression grammar as you had learned in the ToC course
* Able to simulate NFA transitions and match an input string
* No database required for multiuser
* Minimal source codes

## FSM

There are two **finite state machine**s in my program, one for recording current user status and the other for the regular expression parser in the re-compiler.

### Control flow FSM

![](./img/control-fsm.png)

* The FSM for the user.
* There are mainly 6 states for an active user.
  * `initial`
  * `waitingReInput`
  * `hasReInput`
  * `gotNfa`
  * `waitingStringToMatch`
  * `waitingHelpType`
* In any state, user can go to any of `initial`, `waitingReInput` or `waitingHelpType` without restraint via `restart`, `re2nfa` or `help` transition respectively.
* It maps to the clicking on the button of the **template messages** sent by the bot.

### CFSM of RE parser

![](./img/re-parser-cfsm.png)



