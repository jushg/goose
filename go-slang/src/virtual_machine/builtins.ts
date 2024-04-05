import { FuncDeclObj, SysCallObj } from "../parser";
import { sysCallLogic } from "./sysCalls";

const sysCallFunctionDefs = Object.keys(sysCallLogic)
  .filter(
    (key: string) =>
      // goose.peggy ensures that make and new are converted to SysCallObj.
      // Therefore, we do not need to create fn definitions for them.
      key !== "make" && key !== "new"
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

export const builtinsFnDef: FuncDeclObj[] = [...sysCallFunctionDefs];
