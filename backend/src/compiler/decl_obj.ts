import { DeclareInstruction, ExitFunctionInstruction } from "../instruction";
import { ConstDeclObj, FuncDeclObj, VarDeclObj, makeAssignmentStmt, makeIdent } from "../parser";
import { compileTagObj } from "./compileFn";
import { ProgramFile } from "./model";
import { AnyTagObj, assertTagObj } from "./utils";

export const declMap: { [key: string]: (s: AnyTagObj, pf: ProgramFile) => void} = {
    "FUNC_DECL": (s,pf) => {
        assertTagObj<FuncDeclObj>(s)
        pf.instructions.push(new DeclareInstruction(s.ident, null))    
        let declIns = pf.instructions.length
        compileTagObj(s.body, pf)
        pf.instructions.push(new ExitFunctionInstruction())
        //TODO: add decl Int to closure
    },

    "VAR_DECL": (s,pf) => {
        assertTagObj<VarDeclObj>(s)
        pf.instructions.push(new DeclareInstruction(s.ident, s.type))
        if(s.val !== null){
            let assignStmt = makeAssignmentStmt(makeIdent(s.ident),"=", s.val)
            compileTagObj(assignStmt, pf)
        }
    },

    "CONST_DECL": (s,pf) => {
        assertTagObj<ConstDeclObj>(s)
        pf.instructions.push(new DeclareInstruction(s.ident, s.type, true))
        let assignStmt = makeAssignmentStmt(makeIdent(s.ident),"=", s.val)
        compileTagObj(assignStmt, pf)
    }
}




