import { Instruction } from "../instruction";
import { compileTagObj } from "./compileFn";
import { ProgramFile } from "./model";
import { AnyTagObj } from "./utils";
export { ProgramFile} from './model'

export function compile(parsedObjs: [AnyTagObj]): ProgramFile {
  let pf: ProgramFile = {
    instructions: new Array<Instruction>,
    labelMap: {},
    gotoLabelMap: {},
    topLevelDecl: new Array<number>
  }
  parsedObjs.forEach((parsedObj) => {
    pf.topLevelDecl.push(pf.instructions.length)
    compileTagObj(parsedObj,pf)
  })
  
  return pf
}
