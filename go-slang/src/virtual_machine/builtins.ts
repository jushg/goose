import { FuncDeclObj, SysCallObj } from "../parser";
import { sysCallLogic } from "./sysCalls";

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
] satisfies SysCallObj["sym"][];

const sysCallFunctionDefs = Object.keys(sysCallLogic)
  .filter(
    (key: string) => builtInsFromSysCall.find((k) => k === key) !== undefined
  )
  .map((key: string) => {
    return {
      tag: "SYS_CALL",
      sym: key,
      type: null,
      args: [],
    } satisfies SysCallObj;
  })
  .map((sysCall) => {
    const key = sysCall.sym;
    return {
      tag: "STMT",
      stmtType: "FUNC_DECL",
      ident: { tag: "IDENT", val: key },
      lit: {
        tag: "LITERAL",
        type: {
          tag: "TYPE",
          type: { base: "FUNC", inputT: [], returnT: null },
        },
        input: [],
        body: {
          tag: "STMT",
          stmtType: "BLOCK",
          stmts: [{ tag: "STMT", stmtType: "EXPR", expr: sysCall }],
        },
      },
    } satisfies FuncDeclObj;
  });

if (sysCallFunctionDefs.length !== builtInsFromSysCall.length)
  throw new Error(
    `Expected 4 sys calls to be defined ${Object.keys(sysCallLogic)} : ${Object.keys(sysCallLogic).filter((key) => key in builtInsFromSysCall)}`
  );

export const builtinsFnDef: FuncDeclObj[] = [...sysCallFunctionDefs];
