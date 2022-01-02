# ToC-RE-Helper

<p align="center">
  <img src="./img/re2nfa-icon.jpg" width="25%;" align="center"/>
</p>

## Intro

This is the final project for the course "**Theory of Computation**". The project aims to help those who are also participating this course but had a hard time understanding the concept of **regular expression** and **NFA** (non-deterministic finite automata).

The LINE bot **ToC-RE-Helper** would help you transform an **RE** you learned in the class into an equivalent **NFA**. Also, it is capable of performing optimization on your input to minimize the number of states and edges. Finally, once the **NFA** is generated, you can try giving it an input string and see whether the **NFA** can accept it or not!

### Bot basic ID

- @846cqgxg

### QR code

<p style="text-align: center"><img src="./img/846cqgxg.png" width="25%"></p>

* Scan the QR code and add the bot **ToC-RE-Helper** official account as your friends.
* Select **RE to NFA** on the main menu to start crafting your **NFA**!
* If having trouble, you can see the **Help** content by clicking the help option on the main menu.

## Demo

### RE to NFA

<img src="./img/re2nfa-demo.gif" style="width: 20%; align: left;"/>


### RE to NFA (optimized)

<img src="./img/re2nfa-opt-demo.gif" width="25%;" align="left"/>

### Match

<img src="./img/nfa-match-demo.gif" width="25%;" align="left"/>

### Help

<img src="./img/help-demo.gif" width="25%;" align="left"/>

## Features

* Hand crafted regular expression compiler
* NFA optimization for minimal states and transitions
* Same regular expression grammar as you had learned in the ToC course
* Able to simulate NFA transitions
* No database required for multiuser

## FSM

There are two **finite state machine**s in my program, one for recording current user status and the other for the regular expression parser in the re-compiler.

