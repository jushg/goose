import { AssignInstruction, DeclareInstruction, EnterScopeInstruction, ExitFunctionInstruction, ExitScopeInstruction, GotoInstruction, JofInstruction, LdInstruction, MarkInstruction, ResetInstruction } from "../instruction";
import { AssignmentStmtObj, BreakStmtObj, ChanStmtObj, ConstDeclObj, ContStmtObj, DecStmtObj, ExpressionStmtObj, ForStmtObj, FuncDeclObj, GoStmtObj, GotoStmtObj, IdentObj, IfStmtObj, IncStmtObj, NilTypeObj, ReturnStmtObj, SelectStmtObj, StmtObj, SwitchStmtObj, VarDeclObj, makeAssignmentStmt, makeDecStmt, makeUnaryExpr, makeVarDecl } from "../parser";
import { compileTagObj } from "./compileFn";
import { ProgramFile } from "./model";
import { AnyStmtObj, addLabelIfExist, assertTagObj, isStmtObj } from "./utils";


export const smtMap: { [key: string]: (s: AnyStmtObj, pf: ProgramFile) => void} = {
  "EXPR": (s,pf) => {
    assertTagObj<ExpressionStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)
    compileTagObj(s.expr, pf)
  },
  "SEND": (s,pf) => {
    assertTagObj<ChanStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)
    compileTagObj(s.lhs, pf)
    compileTagObj(s.rhs, pf)
    // TODO: Add SendInstruction

  },

  "INC": (s,pf) => {
    assertTagObj<IncStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)
    let unaryExprObj = makeUnaryExpr(s.expr, "++")
    compileTagObj(unaryExprObj, pf)
  },

  "DEC": (s,pf) => {
    assertTagObj<DecStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)
    let unaryExprObj = makeUnaryExpr(s.expr, "--")
    compileTagObj(unaryExprObj, pf)
  },

  "ASSIGN": (s,pf) => {
    assertTagObj<AssignmentStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)
    if( s.op === ":="){
      assertTagObj<IdentObj>(s.lhs)
      let placeHolderType: NilTypeObj = { tag: "TYPE", type: { base: "NIL" } }
      compileTagObj(makeVarDecl(s.lhs,placeHolderType,s.rhs) as StmtObj, pf)
    } else {
      compileTagObj(s.lhs, pf)
      compileTagObj(s.rhs, pf)
      pf.instructions.push(new AssignInstruction()) 
    }

  },


  "IF": (s,pf) => {
    assertTagObj<IfStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)

    pf.instructions.push(new EnterScopeInstruction())
    if(s.pre !== null){
      compileTagObj(s.pre,pf)
    }
    compileTagObj(s.cond,pf)
    pf.instructions.push(new JofInstruction(0))

    let jofPc = pf.instructions.length - 1

    s.body.stmts.forEach((bodyStmt) => {
      compileTagObj(bodyStmt,pf)
    }) 

    pf.instructions.push(new GotoInstruction(0))
    let gotoPc = pf.instructions.length - 1
    pf.instructions[jofPc] = new JofInstruction(pf.instructions.length)
    
    if(s.elseBody !== null){
      if (isStmtObj(s.elseBody)) {
        compileTagObj(s.elseBody,pf)
      } else {
        s.elseBody.stmts.forEach((elseBodyStmt) => {
          compileTagObj(elseBodyStmt,pf)
        })
      }
    }
    pf.instructions[gotoPc] = new GotoInstruction(pf.instructions.length)
    pf.instructions.push(new ExitScopeInstruction())
  },

  "SWITCH": (s,pf) => {
    assertTagObj<SwitchStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)

    pf.instructions.push(new EnterScopeInstruction())
    pf.instructions.push(new MarkInstruction())

    if(s.pre !== null){
      compileTagObj(s.pre,pf)
    }

    compileTagObj(s.cond,pf)

    // TODO: Add JofInstruction and figure this out



    pf.instructions.push(new ExitScopeInstruction())
  },

  "SELECT": (s,pf) => {
    
  },
  "FOR": (s,pf) => {
    assertTagObj<ForStmtObj>(s)
    let predGotoPc = -1

    addLabelIfExist(pf.instructions.length, s.label, pf)
    pf.instructions.push(new EnterScopeInstruction())
    pf.instructions.push(new MarkInstruction())
    if(s.pre !== null){
      compileTagObj(s.pre,pf)
    }

    let startPc = pf.instructions.length

    if(s.cond !== null){
      compileTagObj(s.cond,pf)
      pf.instructions.push(new JofInstruction(pf.instructions.length + 1))
      pf.instructions.push(new GotoInstruction(0))
      predGotoPc = pf.instructions.length - 1
    }

    s.body.stmts.forEach((bodyStmt) => {
      compileTagObj(bodyStmt,pf)
    }) 

    if (s.post !== null) {
      compileTagObj(s.post,pf)
    }

    pf.instructions.push(new GotoInstruction(startPc))
    if (predGotoPc !== -1) {
      pf.instructions[predGotoPc] = new GotoInstruction(pf.instructions.length)
    }

    pf.instructions.push(new ExitScopeInstruction())
  },

  "BREAK": (s,pf) => {
    assertTagObj<BreakStmtObj>(s)
    pf.instructions.push(new ResetInstruction())
    // How to break after reset
  },

  "CONTINUE": (s,pf) => {
    assertTagObj<ContStmtObj>(s)
    pf.instructions.push(new ResetInstruction())
  },

  "GOTO": (s,pf) => {

  },

  "FALLTHROUGH": (s,pf) => {

  },
  "DEFER": (s,pf) => {

  },

  "GO": (s,pf) => {
  },

  "RETURN": (s,pf) => {
    assertTagObj<ReturnStmtObj>(s)
    compileTagObj(s.expr,pf)
    pf.instructions.push(new ExitFunctionInstruction())
  },

  "FUNC_DECL": (s,pf) => {
    assertTagObj<FuncDeclObj>(s)
    pf.instructions.push(new DeclareInstruction(s.ident.val, null))    
    let declIns = pf.instructions.length
    compileTagObj(s.body, pf)
    pf.instructions.push(new ExitFunctionInstruction())
    //TODO: add decl Int to closure
},

"VAR_DECL": (s,pf) => {
    assertTagObj<VarDeclObj>(s)
    pf.instructions.push(new DeclareInstruction(s.ident.val, s.type))
    if(s.val !== null){
        let assignStmt = makeAssignmentStmt(s.ident,"=", s.val)
        compileTagObj(assignStmt, pf)
    }
},

"CONST_DECL": (s,pf) => {
    assertTagObj<ConstDeclObj>(s)
    pf.instructions.push(new DeclareInstruction(s.ident.val, s.type, true))
    let assignStmt = makeAssignmentStmt(s.ident,"=", s.val)
    compileTagObj(assignStmt, pf)
}

  // Add more functions as needed
};
