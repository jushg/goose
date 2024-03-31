import { Instruction } from "../instruction";
import { compileDecl} from "./decl_obj";
import { ProgramFile } from "./model";
import { AnyTagObj } from "./utils";
export {ProgramFile} from './model'

// Dummy function, just for testing.
export function compileSmt(s: StmtObj, pf: ProgramFile) {
  switch (s.stmtType) {
    case "VAR_DECL":
    case "CONST_DECL":
    case "EXPR":
      

    case "SEND":
    case "INC":
    case "DEC":
    case "ASSIGN":
    case "IF":
    case "SWITCH":
    case "SELECT":
    case "FOR":
    case "BREAK":
    case "CONTINUE":
    case "GOTO":
    case "FALLTHROUGH":
    case "DEFER":
    case "GO":
    case "RETURN":
      return;
  }
}



function compile(parsedObj: StmtObj): ProgramFile {
  let pf: ProgramFile = {
    instructions: new Array<Instruction>,
    labelMap: {},
    gotoLabelMap: {},
    compileEnv: {}
  }
  parsedObjs.forEach((parsedObj) => {
    compileDecl(parsedObj,pf)
  })
  
  return pf
}
