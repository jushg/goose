import { AnyInstructionObj } from "../common/instructionObj";
import { compileTagObj } from "./compileFunc";
import { CompiledFile } from "../common/compileFile";
import { AnyTagObj } from "./utils";

export function compile(parsedObjs: [AnyTagObj]): CompiledFile {
  let pf: CompiledFile = {
    instructions: new Array<AnyInstructionObj>(),
    labelMap: {},
    gotoLabelMap: {},
    topLevelDecl: new Array<number>(),
  };
  parsedObjs.forEach((parsedObj) => {
    pf.topLevelDecl.push(pf.instructions.length);
    compileTagObj(parsedObj, pf);
  });

  return pf;
}
