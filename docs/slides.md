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

# CS4215 Project

## AY2023/24 Sem 2


- Bharath Chandra Sudheer
- Hoang Trong Tan


---

### Key Object: Concurrency

Concurrency Primitives:

- `goroutine`, `mutex`, `semaphore`,  `waitgroup`, `channel`
- should not be naive busy-waiting

Granularity level of concurrency: interleaved execution of VM instructions


---

### Other Objectives:

- sequential logic: `for`, `if`, `func`, `func` literals, `var`, primitive types: `bool`, `str`, `int` and related operations and `*T` for any type

- low-level memory management
    - garbage collection: cheney
    - visualisation of memory

---

![](https://hackmd.io/_uploads/rJhp_6sl0.png)

---

### Goose Compiler

![image](https://hackmd.io/_uploads/S13BNpox0.png)

---

### Gosling VM

![image](https://hackmd.io/_uploads/SJW84pogA.png)

---

### Final Result

![image](https://hackmd.io/_uploads/Hkh5EaolR.png)


---

### Key Tools

- [PeggyJs](peggyjs.org) generates left-recursive parser in JS
- TSC: strong confidence in preventing malformed objects and ensuring safe logic in parsing, compiling and execution
- Jest: CI/CD regression testing & test-driven development

---

### Compiler

- recursive compiler 
    - well-typed parsed objects -> well-typed instruction data objects
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
- operand-stack architecture, with RTS and OS both stored in VM-managed memory
- provides access to thread control and sys call (`print`, `breakpoint`, `yield`, ...)

---

### Memory Management

- our heap is an ArrayBuffer split into fixed-size nodes
- types: `Int`, `Bool`, `Str` and `Binary Pointer`
- composite types (e.g. list, queue, stack, function ptr) are built with `Binary Pointer`
- runtime stacks (incl. environment) and operands stacks are stored in the heap

---

### Garbage Collection

- Stop and Copy (Cheney's) due to low memory residency
- space: $O(1)$, time: $O(\text{liveNodes})$

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

----

### Function Calls / Go routines

- functions as first class objects
- support expressions as args or as functions
- applicative-order evaluation

<img src="https://hackmd.io/_uploads/Hy7KKnigC.png" height="300" />

----

### Runtime Stack (`foo()`)


![image](https://hackmd.io/_uploads/HJ2_LjoxA.png)


----

### Runtime Stack (`go foo()`)

![image](https://hackmd.io/_uploads/B1HzDioxA.png)

---

### Limitations & Future

- Goose types: array, struct
- typechecking
- compile time env

---

### Demo

#### [goose-liard.vercel.app](https://goose-liard.vercel.app)

---

# Q & A

---

### Copyright

<a href="https://www.flaticon.com/free-icons/goose" title="goose icons">Goose icons created by manshagraphics - Flaticon</a>

<a href="https://daman.co.id/style-icon-ryan-gosling">Gosling photo from daman.co.id</a>