import { AnyInstructionObj } from "../common/instructionObj";
import { compileTagObj } from "./compileFunc";
import { CompileFile } from "../common/compileFile";
import { AnyTagObj } from "./utils";

export function compile(parsedObjs: [AnyTagObj]): CompileFile {
  let pf: CompileFile = {
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
