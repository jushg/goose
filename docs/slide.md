## Project: Goose Intepreter

#### Golang sublanguage implementation using virtual machine

Team:

- Bharath Chandra Sudheer
- Hoang Trong Tan

---

## Table of Contents

- Language Features Overview
- Software Architecture Overview
- Implementation Deepdive
  - Parsing and Compiling
  - Virtual Machine Runner
  - Memory Management
  - Concurrency Control
- Other Dependencies:
  - Frontend
  - Peggy
  - Jest for testing

---

### Language Features Overview

Broadly speaking, the Goose interpreter is a TypeScript program that takes in any Go program and outputs an evaluation result of that program.

Supported features:

- Sequencial logic: for, if , function, variable, primitive type arithmetic
- Concurrency logic: goroutine, channel, waitgroup

---

### Software Architecture Overview

The Goose intepreter consist of 3 main parts:

- Parser
- Compiler
- Executor

---

### Implementation Deepdive

Details on the important aspect of our implementation

---

### Parsing and Compiling

A Golang Grammar file (goose.peg) is written by us, which is then used by Peggy.js to generate our parser logic

Compiling logic is recursively calling the parsed object to create new instructions. (Can talk about NOOP logic insertion here)

---

### Virtual Machine Runner

---

### Memory Management

Heap is used as our central memory storage:

- Heap is a collection of fixed size heap node, decode and encode to bytes format
- Data on heap node are of 4 types: Int, Bool, String and Binary Pointer
- Binary Pointer is heavily utilised to create more complex composite types
- Build our run time environments and operands stacks on top of the heap

---

### Garbage Collection

The garbage collection scheme we use is Stop and Copy, based loosely on Cheney algorithm with some modification (reason is low memory residency -> have graph to show):

- Follow tricolor marking scheme to explore all nodes reachable from roots (RTS and OS):
  - Maintain a forward address mapping table
  - If node address not in table, create copy in new memory region
  - If is in table, skip
- Modified step: Iterate through newly copied memory, and fix pointers in the binary pointers to the new address in the forward address table

---

### Concurrency Control

General idea

- Using event queue architecture with time slices to simulate concurrency constructs.
- Threads are picked up and executed by the event loop in a round robin sequence

---

### Goroutine creation

On goroutine creation, we spawn new thread from existing thread by:

- Insert details

---

### Concurrency primitives:

We create these atomic instructions:

- done() sysCall: when call done on main, also terminate other threads
- yield() sysCall: set Timeslice of current thread to 0, relinquish control to other running threads
- test and set: atomic instruction for test and set

---

### Concurrency constructs:

Base on the primitive concurrency instructions, we created:

- mutex
- semaphore: bounded range atomic integer semaphore
- waitgroup: using semaphore
- channel: using semaphore and mutex

---

### Other Dependencies
