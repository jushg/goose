import { CompiledFile } from "../common/compileFile";
import {
  AnyInstructionObj,
  DoneInstructionObj,
} from "../common/instructionObj";
import { BlockObj, CallObj, ProgramObj, StmtObj, SysCallObj } from "../parser";
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
      ...builtinsFnDef,
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
  };

  compileTagObj(addGlobalEnv(programTopLevelDeclarations), pf);
  return pf;
}
