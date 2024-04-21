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
    const fn = `func ${sysCallName}() { return __noop(${sysCallName}); }`;
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
func wgInit() *int { return boundedSemInit(2147483647, 0) }
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
  func queueInit(capacity int) *int {
    dummyPtr := new(int)
    *dummyPtr = -1
    queueDataPtr := makeBinPtr(&dummyPtr, &dummyPtr)

    sizePtr := new(int)
    *sizePtr = 0
    capacityPtr := new(int)
    *capacityPtr = capacity
    sizeCapacityPtr := makeBinPtr(sizePtr, capacityPtr)

    return makeBinPtr(&queueDataPtr, &sizeCapacityPtr)    
  }
  
  func pushBackQueue(queue *int, val int) {
    for ; !tryPushBackQueue(queue, val) ; { yield() }
  }
  
  func tryPushBackQueue(queue *int, val int) bool {
    size := queueSize(queue)
    capacity := queueCapacity(queue)

    if size == capacity {
      return false
    }
  
    newBackPtr := new(int)
    *newBackPtr = val

    setBinPtrChild2(&(*getBinPtrChild2(*queue)), &newBackPtr)
    setBinPtrChild2(&(*queue), &newBackPtr)

    updateQueueSize(queue, size + 1)
    return true
  }

  func tryPopFrontQueue(queue *int) *int {
    size := queueSize(queue)
    var nilPtr *int
  
    if size == 0 {
      return nilPtr
    }
  
    frontVal := peekFrontQueue(queue)
    realFrontPtr := *getBinPtrChild2(**queue)
    nextFrontPtr := getBinPtrChild2(realFrontPtr)
    updateQueueSize(queue, size - 1)
    if queueSize(queue) == 0 {
      setBinPtrChild2(&(*queue), &(**queue))
    } else {
      setBinPtrChild2(&(**queue), &(*nextFrontPtr))
    }
    return &frontVal
  }

  func peekFrontQueue(queue *int) int {
    if queueSize(queue) == 0 {
      return -1
    }
    return **getBinPtrChild2(**queue)
  }

  func popFrontQueue(queue *int) int {
    var nilPtr *int
    for ; true ; {
      val := tryPopFrontQueue(queue)
      if val != nilPtr {
        return *val
      }
      yield()
    }
  }

  func updateQueueSize(queue *int, size int) {
    sizePtr := *getBinPtrChild2(queue)
    *sizePtr = size
  }

  func queueSize(queue *int) int {
    sizeCapacityPtr := *getBinPtrChild2(queue)
    return *sizeCapacityPtr
  }

  func queueEmpty(queue *int) bool {
    return queueSize(queue) == 0
  }

  func queueFull(queue *int) bool {
    size := queueSize(queue)
    capacity := queueCapacity(queue)
    return size == capacity
  }

  func queueCapacity(queue *int) int {
    sizeCapacityPtr := *getBinPtrChild2(queue)
    return *getBinPtrChild2(sizeCapacityPtr)
  }

  `,
  {}
);

export const channelBuiltins = {
  chanInit: {
    fnName: "chanInit",
    argCount: 1,
  },
  chanSend: {
    fnName: "chanSend",
    argCount: 2,
  },
  chanRecv: {
    fnName: "chanRecv",
    argCount: 1,
  },
};

// Channel functions
// Use `chanInit` to create a channel:
// use 0 to create an unbuffered channel,
// and use a positive integer to create a buffered channel.
updateBuiltinsFnDef(
  `
func chanInit(capacity int) *int {
  queuePtr := queueInit(capacity + 1)

  chanMutexPtr := mutexInit()

  emptySem := boundedSemInit(capacity + 1, capacity + 1)
  fullSem := boundedSemInit(capacity + 1, 0)
  semPtr := makeBinPtr(&emptySem, &fullSem)
  chanControlPtr := makeBinPtr(&semPtr, &chanMutexPtr)

  return makeBinPtr(&queuePtr, &chanControlPtr)
}


func chanSend(ch *int, val int) {
  chanControlPtr := *getBinPtrChild2(ch)
  semPtr := *chanControlPtr
  mutexPtr := *getBinPtrChild2(chanControlPtr)
  emptySem := *semPtr
  fullSem := *getBinPtrChild2(semPtr)
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
  chanControlPtr := *getBinPtrChild2(ch)
  semPtr := *chanControlPtr
  mutexPtr := *getBinPtrChild2(chanControlPtr)
  emptySem := *semPtr
  fullSem := *getBinPtrChild2(semPtr)
  queuePtr := *ch

  boundedSemWait(fullSem)
  mutexLock(mutexPtr)
  val := popFrontQueue(queuePtr)
  mutexUnlock(mutexPtr)
  boundedSemPost(emptySem)
  return val
}
`,
  {}
);

export const builtinsFnDef = _builtinsFnDef;
