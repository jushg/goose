import { CompiledFile } from "../common/compileFile";
import { ExprObj, StmtObj } from "../parser";
import { getExprLogic } from "./exprObj";
import { getStmtLogic } from "./stmtObj";
import { AnyTagObj, isTag } from "./utils";

export function compileTagObj(s: AnyTagObj, pf: CompiledFile) {
  if (isTag("STMT", s)) {
    compileStmtObj(s, pf);
  } else {
    compileExprObj(s satisfies ExprObj, pf);
  }
}

function compileStmtObj(s: StmtObj, pf: CompiledFile) {
  getStmtLogic(s.stmtType)(s, pf);
}

function compileExprObj(obj: ExprObj, pf: CompiledFile) {
  getExprLogic(obj.tag)(obj, pf);
}
