import { ProgramFile } from ".";
import {
  makeEnterScopeInstruction,
  makeExitScopeInstruction,
} from "../common/instructionObj";
import { BlockObj } from "../parser";
import { exprMap } from "./exprObj";
import { smtMap } from "./stmtObj";
import { AnyStmtObj, AnyTagObj, isBlockObj, isStmtObj } from "./utils";

export function compileTagObj(s: AnyTagObj, pf: ProgramFile) {
  if (isStmtObj(s)) {
    compileStmtObj(s, pf);
  } else if (isBlockObj(s)) {
    compileBlockObj(s, pf);
  } else {
    compileExprObj(s, pf);
  }
}

function compileBlockObj(s: BlockObj, pf: ProgramFile) {
  pf.instructions.push(makeEnterScopeInstruction());
  s.stmts.forEach((stmt) => {
    compileTagObj(stmt, pf);
  });
  pf.instructions.push(makeExitScopeInstruction());
}

function compileStmtObj(s: AnyStmtObj, pf: ProgramFile) {
  smtMap[s.stmtType](s, pf);
}

function compileExprObj(obj: AnyTagObj, pf: ProgramFile) {
  exprMap[obj.tag](obj, pf);
}
