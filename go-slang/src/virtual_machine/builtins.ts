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

export const builtinsFnDef = _builtinsFnDef;
