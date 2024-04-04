import { CompiledFile } from "../common/compileFile";
import { AnyInstructionObj } from "../common/instructionObj";
import { BlockObj, ProgramObj } from "../parser";
import { sysCallFunctionDefs } from "../virtual_machine/sysCalls";
import { compileTagObj } from "./compileFunc";

function addGlobalEnv(programTopLevelDeclarations: ProgramObj): BlockObj {
  return {
    tag: "STMT",
    stmtType: "BLOCK",
    stmts: [
      {
        tag: "STMT",
        stmtType: "BLOCK",
        stmts: programTopLevelDeclarations,
      },
      ...sysCallFunctionDefs,
    ],
  };
}

export function compile(programTopLevelDeclarations: ProgramObj): CompiledFile {
  let pf: CompiledFile = {
    instructions: new Array<AnyInstructionObj>(),
    labelMap: {},
    gotoLabelMap: {},
  };

  compileTagObj(addGlobalEnv(programTopLevelDeclarations), pf);
  return pf;
}
