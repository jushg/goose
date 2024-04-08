import {
  AnyInstructionObj,
  OpCode,
  SysCallInstructionObj,
} from "../common/instructionObj";
import { makeIntLiteralObj } from "../parser";
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

// Mutex functions
updateBuiltinsFnDef(`func mutexInit() *int { return new(int); }`, {});
updateBuiltinsFnDef(
  `
func mutexLock(unlockedMutexPtr *int) {
  for ; testAndSetInt(unlockedMutexPtr, 0, 1) ; {}
}`,
  {}
);
updateBuiltinsFnDef(
  `
func mutexUnlock(unlockedMutexPtr *int) {
  for ; testAndSetInt(unlockedMutexPtr, 1, 0) ; {}
}`,
  {}
);

export const builtinsFnDef = _builtinsFnDef;
