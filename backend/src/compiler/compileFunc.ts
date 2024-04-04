import { CompiledFile } from "../common/compileFile";
import { ExprObj, StmtObj } from "../parser";
import { exprMap } from "./exprObj";
import { smtMap } from "./stmtObj";
import { AnyTagObj, isTag } from "./utils";

export function compileTagObj(s: AnyTagObj, pf: CompiledFile) {
  if (isTag("STMT", s)) {
    compileStmtObj(s, pf);
  } else {
    compileExprObj(s satisfies ExprObj, pf);
  }
}

function compileStmtObj(s: StmtObj, pf: CompiledFile) {
  smtMap[s.stmtType](s, pf);
}

function compileExprObj(obj: ExprObj, pf: CompiledFile) {
  exprMap[obj.tag](obj, pf);
}
