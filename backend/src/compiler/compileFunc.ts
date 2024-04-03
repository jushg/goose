import { CompiledFile } from "../common/compileFile";
import {
  makeEnterScopeInstruction,
  makeExitScopeInstruction,
} from "../common/instructionObj";
import { BlockObj, ExprObj, StmtObj } from "../parser";
import { exprMap } from "./exprObj";
import { smtMap } from "./stmtObj";
import { AnyTagObj, isTag } from "./utils";

export function compileTagObj(s: AnyTagObj, pf: CompiledFile) {
  if (isTag("STMT", s)) {
    compileStmtObj(s, pf);
  } else if (isTag("BLOCK", s)) {
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

function compileStmtObj(s: StmtObj, pf: CompiledFile) {
  smtMap[s.stmtType](s, pf);
}

function compileExprObj(obj: ExprObj, pf: CompiledFile) {
  exprMap[obj.tag](obj, pf);
}
