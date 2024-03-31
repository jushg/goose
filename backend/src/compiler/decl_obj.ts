import { DeclareInstruction } from "../instruction";
import { ConstDeclObj, FuncDeclObj, StmtObj, VarDeclObj, makeAssignmentStmt, makeIdent } from "../parser";
import { ProgramFile } from "./model";
import { compileBlock, compileStmt } from "./stmt_obj";
import { AnyTagObj, assertTagObj } from "./utils";



export function compileDecl(s: AnyTagObj, pf: ProgramFile) {
    fnMap[s.tag](s,pf)
}

const fnMap: { [key: string]: (s: AnyTagObj, pf: ProgramFile) => void} = {
    "FUNC_DECL": (s,pf) => {
        assertTagObj<FuncDeclObj>(s)
        pf.instructions.push(new DeclareInstruction(s.ident, null))    
        let declIns = pf.instructions.length
        compileBlock(s.body, pf)
    },

    "VAR_DECL": (s,pf) => {
        assertTagObj<VarDeclObj>(s)
        pf.instructions.push(new DeclareInstruction(s.ident, s.type))
        if(s.val !== null){
            let assignStmt = makeAssignmentStmt(makeIdent(s.ident),"=", s.val)
            compileStmt(assignStmt, pf)
        }
    },

    "CONST_DECL": (s,pf) => {
        assertTagObj<ConstDeclObj>(s)
        pf.instructions.push(new DeclareInstruction(s.ident, s.type, true))
        let assignStmt = makeAssignmentStmt(makeIdent(s.ident),"=", s.val)
        compileStmt(assignStmt, pf)
    }
}




