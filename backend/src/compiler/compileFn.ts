import { ProgramFile } from ".";
import { EnterScopeInstruction, ExitScopeInstruction } from "../instruction";
import { BlockObj } from "../parser";
import { declMap } from "./decl_obj";
import { exprMap } from "./expr_obj";
import { smtMap } from "./stmt_obj";
import { AnyStmtObj, AnyTagObj, isBlockObj, isStmtObj } from "./utils";


export function compileTagObj(s: AnyTagObj, pf: ProgramFile) {
    if (isStmtObj(s)) {
        compileStmtObj(s,pf)
    } else if (isBlockObj(s)) {
        compileBlockObj(s,pf)
    } else if(s.tag ==="FUNC_DECL" || s.tag === "VAR_DECL" || s.tag === "CONST_DECL") {
        compileDeclObj(s,pf)
    } else {
        compileExprObj(s,pf)
    }
}
function compileBlockObj(s: BlockObj, pf: ProgramFile) {
    pf.instructions.push(new EnterScopeInstruction())
    s.stmts.forEach((stmt) => {
        compileTagObj(stmt, pf)
    })
    pf.instructions.push(new ExitScopeInstruction())
  }
  
  
function compileStmtObj(s: AnyStmtObj, pf: ProgramFile) {
    smtMap[s.stmtType](s,pf)
  }
  
function compileDeclObj(s: AnyTagObj, pf: ProgramFile) {
    declMap[s.tag](s,pf)
}

function compileExprObj(obj: AnyTagObj, pf: ProgramFile) {
    exprMap[obj.tag](obj, pf)
}