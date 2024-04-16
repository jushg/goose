import { CompiledFile } from "../common/compiledFile";
import { OpCode, makeClearOsInstruction } from "../common/instructionObj";
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
  const lastInstr = pf.instructions.at(-1);
  if (lastInstr?.op !== OpCode.CLEAR_OS)
    pf.instructions.push(makeClearOsInstruction());
}

function compileExprObj(obj: ExprObj, pf: CompiledFile) {
  getExprLogic(obj.tag)(obj, pf);
}
