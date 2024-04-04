import { CompiledFile } from "../common/compileFile";
import { AnyInstructionObj } from "../common/instructionObj";
import { BlockObj, ProgramObj } from "../parser";
import { builtinsFnDef } from "../virtual_machine/builtins";
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
      ...builtinsFnDef,
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
