import {
  AnyInstructionObj,
  OpCode,
  SysCallInstructionObj,
} from "../common/instructionObj";
import { sysCallLogic } from "./sysCalls";

const _builtinsFnDef: {
  functions: string[];
  noopTags: Record<string, AnyInstructionObj[]>;
} = { functions: [], noopTags: {} };

function updateBuiltinsFnDef(
  fn: string,
  noopTags: Record<string, AnyInstructionObj[]>
): void {
  _builtinsFnDef.functions.push(fn);
  for (const [key, value] of Object.entries(noopTags)) {
    if (key in _builtinsFnDef.noopTags) {
      throw new Error(`Expected noopTags[${key}] to be undefined`);
    }
    _builtinsFnDef.noopTags[key] = value;
  }
}

// goose.peggy ensures that `make`/`new` are converted to SysCallObj.
// Therefore, we do not need to create fn definitions for them.
// Some of the remaining sys calls are expected to be only called by compiler.
// Here are the remaining:
const builtInsFromSysCall = [
  "print",
  "printOS",
  "printHeap",
  "triggerBreakpoint",
  "yield",
  "makeBinPtr",
  "getBinPtrChild2",
  "setBinPtrChild2",
] satisfies SysCallInstructionObj["sym"][];

const sysCallFunctionDefs = Object.keys(sysCallLogic)
  .map((key: string) => key as SysCallInstructionObj["sym"])
  .filter(
    (key: string) => builtInsFromSysCall.find((k) => k === key) !== undefined
  )
  .map((sysCallName) => {
    return [
      sysCallName,
      {
        tag: "INSTR",
        op: OpCode.SYS_CALL,
        sym: sysCallName,
        type: null,
        argCount: 0,
      } satisfies SysCallInstructionObj,
    ] as const;
  })
  .map(([sysCallName, sysCallInstr]) => {
    const fn = `func ${sysCallName}() { __noop(${sysCallName}); }`;
    updateBuiltinsFnDef(fn, { [sysCallName]: [sysCallInstr] });
  });

updateBuiltinsFnDef(
  `
func testAndSetInt(ptr *int, expected int, desired int) bool {
  return __noop(testAndSetInt_TEST_AND_SWAP)
}`,
  {
    testAndSetInt_TEST_AND_SWAP: [
      // Desired
      { tag: "INSTR", op: OpCode.LD, symbol: "desired" },
      // Expected
      { tag: "INSTR", op: OpCode.LD, symbol: "expected" },
      // Mutex PTR
      { tag: "INSTR", op: OpCode.LD, symbol: "ptr" },
      {
        tag: "INSTR",
        op: OpCode.TEST_AND_SET,
      },
    ],
  }
);

updateBuiltinsFnDef(
  `
func max(x, y int) {
  if x > y {
    return x
  }
  return y
}

func min(x, y int) {
  if x < y {
    return x
  }
  return y
}`,
  {}
);

// Mutex functions
updateBuiltinsFnDef(
  `
func mutexInit() *int { return new(int); }

func mutexLock(unlockedMutexPtr *int) {
  for ; !testAndSetInt(unlockedMutexPtr, 0, 1) ; {
    yield()
  }
}

func mutexUnlock(unlockedMutexPtr *int) {
  for ; !testAndSetInt(unlockedMutexPtr, 1, 0) ; {
    yield()
  }
}`,
  {}
);

// BoundedSem functions
updateBuiltinsFnDef(
  `
func boundedSemInit(upperBound, initialValue int) *int {
  countPtr := new(int)
  upperBoundPtr := new(int)

  *countPtr = initialValue
  *upperBoundPtr = upperBound
  return makeBinPtr(countPtr, upperBoundPtr)
}

func boundedSemPost(sem *int) {
  bound := *getBinPtrChild2(sem)
  desired := min(*sem + 1, bound)
  for ; !testAndSetInt(sem, desired-1, desired) ; {
    yield()
    desired = min(*sem + 1, bound)
  }
}

func boundedSemWait(sem *int) {
  bound := *getBinPtrChild2(sem)
  desired := max(*sem - 1, 0)
  for ; !testAndSetInt(sem, desired+1, desired) ; {
    yield()
    desired = max(*sem - 1, 0)
  }
}`,
  {}
);

// WaitGroup functions
updateBuiltinsFnDef(
  `
func wgInit() { return boundedSemInit(2147483647, 0) }
func wgAdd(wg *int) { boundedSemPost(wg) }
func wgDone(wg *int) { boundedSemWait(wg) }
func wgWait(wg *int) {
  for ; *wg != 0 ; { yield() }
}
`,
  {}
);

// Queue data structure
updateBuiltinsFnDef(
  `
  func makeQueue(capacity int) *int {
    frontPtr := new(int)
    queueDataPtr := makeBinPtr(frontPtr, frontPtr)
    sizePtr := new(int)
    *sizePtr = 0
    dataAndSizePtr := makeBinPtr(queueDataPtr, sizePtr)
  
    capacityPtr := new(int)
    *capacityPtr = capacity
    return makeBinPtr(dataAndSizePtr, capacityPtr)
  }
  
  func pushBackQueue(queue *int, val int) {
    for ; !tryPushBack(queue, val) ; { yield() }
  }
  
  func tryPushBackQueue(queue *int, val int) bool {
    dataAndSizePtr := *queue
    dataPtr := *dataAndSizePtr
    size := *getBinPtrChild2(dataAndSizePtr)
    capacity := *getBinPtrChild2(queue)
  
    if size == capacity {
      return false
    }
  
    newNextPtr := new(int)
    *newNextPtr = val
  
    oldBackPtr := getBinPtrChild2(dataPtr)
    *oldBackPtr = makeBinPtr(**oldBackPtr, newNextPtr)
  
    *dataPtr = makeBinPtr(**dataPtr, newNextPtr)
  
    sizePtr := *getBinPtrChild2(dataAndSizePtr)
  
    *sizePtr = size + 1
  
    return true
  }

  func tryPopFrontQueue(queue *int) *int {
    dataAndSizePtr := *queue
    dataPtr := *dataAndSizePtr
    size := *getBinPtrChild2(dataAndSizePtr)
  
    if size == 0 {
      return nil
    }
  
    frontPtr := *dataPtr
    
    realFrontPtr := getBinPtrChild2(frontPtr)
    frontVal := *realFrontPtr
  
    nextFrontPtr := getBinPtrChild2(realFrontPtr)
    *frontPtr = makeBinPtr(**frontPtr, nextFrontPtr)
  
    if nextFrontPtr == nil {
      *dataPtr = makeBinPtr(**dataPtr, **dataPtr)
    }
    sizePtr := *getBinPtrChild2(dataAndSizePtr)
    *sizePtr = size - 1
    return frontVal
  }

  func popFrontQueue(queue *int) int {
    for ; true ; {
      val := tryPopFront(queue)
      if val != nil {
        return *val
      }
      yield()
    }
  }

  func queueSize(queue *int) int {
    return *getBinPtrChild2(*queue)
  }

  func queueEmpty(queue *int) bool {
    return queueSize(queue) == 0
  }

  func queueFull(queue *int) bool {
    dataAndSizePtr := *queue
    size := *getBinPtrChild2(dataAndSizePtr)
    capacity := *getBinPtrChild2(queue)
    return size == capacity
  }

  func queueCapacity(queue *int) int {
    return *getBinPtrChild2(queue)
  }

  `,
  {}
);

// Channel functions
// Use `chanInit` to create a channel:
// use 0 to create an unbuffered channel,
// and use a positive integer to create a buffered channel.
updateBuiltinsFnDef(
  `
func chanInit(capacity int) *int {
  queuePtr := makeQueue(capacity + 1)

  chanMutexPtr := mutexInit()

  emptySem := boundedSemInit(capacity + 1, capacity + 1)
  fullSem := boundedSemInit(capacity + 1, 0)
  semPtr := makeBinPtr(emptySem, fullSem)
  chanControlPtr := makeBinPtr(semPtr, chanMutexPtr)
  return makeBinPtr(queuePtr, chanControlPtr)
}


func chanSend(ch *int, val int) {
  chanControlPtr := *getBinPtrChild2(*ch)
  semPtr := *getBinPtrChild2(chanControlPtr)
  emptySem := *getBinPtrChild2(semPtr)
  fullSem := *getBinPtrChild2(semPtr)
  mutexPtr := *getBinPtrChild2(chanControlPtr)
  queuePtr := *ch

  boundedSemWait(emptySem)
  mutexLock(mutexPtr)
  pushBackQueue(queuePtr, val)
  mutexUnlock(mutexPtr)
  boundedSemPost(fullSem)

  for ; true ; {
    mutexLock(mutexPtr)
    if !queueFull(queuePtr) {
      mutexUnlock(mutexPtr)
      break
    }
    mutexUnlock(mutexPtr)
    yield()
  }
}

func chanRecv(ch *int) int {
  chanControlPtr := *getBinPtrChild2(*ch)
  semPtr := *getBinPtrChild2(chanControlPtr)
  emptySem := *getBinPtrChild2(semPtr)
  fullSem := *getBinPtrChild2(semPtr)
  mutexPtr := *getBinPtrChild2(chanControlPtr)


  boundedSemWait(fullSem)
  mutexLock(mutexPtr)
  val := popFrontQueue(*ch)
  mutexUnlock(mutexPtr)
  boundedSemPost(emptySem)
  return val
}
`,
  {}
);

export const builtinsFnDef = _builtinsFnDef;
