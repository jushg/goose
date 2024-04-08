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
    _builtinsFnDef.functions.push(fn);
    _builtinsFnDef.noopTags[sysCallName] = [sysCallInstr];
  });

if (sysCallFunctionDefs.length !== builtInsFromSysCall.length)
  throw new Error(
    `Expected 4 sys calls to be defined ${Object.keys(sysCallLogic)} : ${Object.keys(sysCallLogic).filter((key) => key in builtInsFromSysCall)}`
  );

export const builtinsFnDef = _builtinsFnDef;
