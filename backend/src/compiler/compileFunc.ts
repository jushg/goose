import { CompiledFile } from "../common/compileFile";
import {
  makeEnterScopeInstruction,
  makeExitScopeInstruction,
} from "../common/instructionObj";
import { BlockObj } from "../parser";
import { exprMap } from "./exprObj";
import { smtMap } from "./stmtObj";
import { AnyStmtObj, AnyTagObj, isBlockObj, isStmtObj } from "./utils";

export function compileTagObj(s: AnyTagObj, pf: CompiledFile) {
  if (isStmtObj(s)) {
    compileStmtObj(s, pf);
  } else if (isBlockObj(s)) {
    compileBlockObj(s, pf);
  } else {
    compileExprObj(s, pf);
  }
}

function compileBlockObj(s: BlockObj, pf: CompiledFile) {
  pf.instructions.push(makeEnterScopeInstruction());
  s.stmts.forEach((stmt) => {
    compileTagObj(stmt, pf);
  });
  pf.instructions.push(makeExitScopeInstruction());
}

function compileStmtObj(s: AnyStmtObj, pf: CompiledFile) {
  smtMap[s.stmtType](s, pf);
}

function compileExprObj(obj: AnyTagObj, pf: CompiledFile) {
  exprMap[obj.tag](obj, pf);
}
