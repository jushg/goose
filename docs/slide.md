---
type: slide
---

<style type="text/css">
  .reveal p {
    text-align: left;
    padding-left: 40px;
  }
  .reveal ul {
    display: block;
  }
  .reveal ol {
    display: block;
  }
</style>

## Project: Goose Intepreter

#### Golang sublanguage implementation (VM)

Team:

- Bharath Chandra Sudheer
- Hoang Trong Tan

---

### Architecture

<img src="https://hackmd.io/_uploads/SysxRcogC.png" height="300" />

<p>Note: TSC / JavaScript V8 excluded for brevity</p>

---

### Language Features Overview

- sequential logic: `for`, `if`, `func`, `func` literals, `var`, primitive types: `bool`, `str`, `int` and related operations and `*T` for any type

- concurrency logic: `goroutine`, `mutex`, `semaphore`, `waitgroup`, `channel`

---

### Demo

#### [goose-liard.vercel.app](https://goose-liard.vercel.app)

---

### Parser

- `goose.peg` and `peggyHelpers.ts` define types and grammar
- [PeggyJs](peggyjs.org) generates left-recursive parser in JS
- well-typed parser data objects

---

### Compiler

- recursive compiler with well-typed instruction data objects
- macro-like compiler directives for reusable Gosling snippets
- `addGlobalEnv` to set builtins

---

### Compiler Macro Example

```typescript=
updateBuiltinsFnDef(
  `
func testAndSetInt(ptr *int, expected, desired int) bool {
  return __noop(testAndSetInt_TEST_AND_SWAP)
}`,
  {
    testAndSetInt_TEST_AND_SWAP: [
      { op: OpCode.LD, symbol: "desired" },
      { op: OpCode.LD, symbol: "expected" },
      { op: OpCode.LD, symbol: "ptr" },
      { op: OpCode.TEST_AND_SET },
    ],
  }
)
```

---

### Virtual Machine

- Gosling interpreter written in Typescript
- operand-stack architecture, with RTS and OS both stored in VM memory
- provides access to thread control and sys call

---

### Exploring call behaviour

```go=
func main() {
    bar := "main bar"
    foo(1)
    go foo(1)
}

func foo(y int) {
    bar := "foo bar"
    x = x + y // breakpoint
    return
}
```

---

### Function Calls / Go routines

- functions as first class objects
- support expressions as args or as functions
- applicative-order evaluation

<img src="https://hackmd.io/_uploads/Hy7KKnigC.png" height="300" />

---

### Runtime Stack (`foo()`)

![image](https://hackmd.io/_uploads/HJ2_LjoxA.png)

---

### Runtime Stack (`go foo()`)

![image](https://hackmd.io/_uploads/B1HzDioxA.png)

---

### Memory Management

- our heap is a collection of fixed size nodes
- types: `Int`, `Bool`, `String` and `Binary Pointer`
- composite types (e.g. list, queue, stack, function ptr) are built with `Binary Pointer`
- runtime stacks (incl. environment) and operands stacks are stored in the heap

---

### Garbage Collection

- Stop and Copy (Cheney's) due to low memory residency

- space: $O(1)$
- time: $O(\text{liveNodes})$

---

### Concurrency Control

![image](https://hackmd.io/_uploads/r16yVhjg0.png)

---

### Key Concurrency Instructions:

- `SysCall('done')`: terminate execution (if main, terminate all)
- `SysCall('yield')`: relinquish CPU control
- `TestAndSet`: key atomic instruction to implement `mutex` and `semaphore`.

---

### Concurrency Constructs:

- `mutex`
- `semaphore`: with explicit upper-bound
- `waitgroup`: bounded semaphore
- `channel`: bounded semaphore & mutex

---

# Q & A
