import { CompiledFile } from "../common/compiledFile";
import { AnyInstructionObj } from "../common/instructionObj";
import {
  BlockObj,
  CallObj,
  FuncDeclObj,
  ProgramObj,
  StmtObj,
  SysCallObj,
  parse,
} from "../parser";
import { builtinsFnDef } from "../virtual_machine/builtins";
import { compileTagObj } from "./compileFunc";

function addGlobalEnv(programTopLevelDeclarations: ProgramObj): BlockObj {
  const callMain: CallObj = {
    tag: "CALL",
    func: { tag: "IDENT", val: "main" },
    args: [],
  };
  const done: SysCallObj = {
    tag: "SYS_CALL",
    sym: "done",
    type: null,
    args: [],
  };

  return {
    tag: "STMT",
    stmtType: "BLOCK",
    stmts: [
      ...builtinsFnDef.functions
        .flatMap((fnStr) => parse(fnStr) as ProgramObj)
        .map((fn) => {
          if (fn.tag !== "STMT" || fn.stmtType !== "FUNC_DECL") {
            throw new Error(`Expected FUNC_DECL in ${JSON.stringify(fn)}`);
          }
          return fn as FuncDeclObj;
        }),
      {
        tag: "STMT",
        stmtType: "BLOCK",
        stmts: [
          ...programTopLevelDeclarations,
          ...[callMain, done].map((expr) => {
            const stmt: StmtObj = { tag: "STMT", stmtType: "EXPR", expr };
            return stmt;
          }),
        ],
      },
    ],
  };
}

export function compileParsedProgram(
  programTopLevelDeclarations: ProgramObj
): CompiledFile {
  let pf: CompiledFile = {
    instructions: new Array<AnyInstructionObj>(),
    labelMap: {},
    gotoLabelMap: {},
    noopReplaceMap: { ...builtinsFnDef.noopTags },
  };

  compileTagObj(addGlobalEnv(programTopLevelDeclarations), pf);
  return pf;
}
