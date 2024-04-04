import { CompiledFile } from "../common/compileFile";
import { AnyInstructionObj } from "../common/instructionObj";
import { BlockObj, ProgramObj } from "../parser";
import { compileTagObj } from "./compileFunc";

function addGlobalEnv(programTopLevelDeclarations: ProgramObj): BlockObj {
  return {
    tag: "BLOCK",
    stmts:
      // [
      // { tag: "BLOCK", stmts: builtins }
      // {
      //   tag: "BLOCK",
      // stmts:
      programTopLevelDeclarations,
    // },
    // ],
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
