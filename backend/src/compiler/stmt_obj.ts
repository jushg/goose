import { AssignInstruction, EnterScopeInstruction, ExitFunctionInstruction, ExitScopeInstruction, GotoInstruction, JofInstruction, LdInstruction, ResetInstruction } from "../instruction";
import { AssignmentStmtObj, BlockObj, BreakStmtObj, ChanStmtObj, ContStmtObj, DecStmtObj, DeferStmtObj, ExprObj, ExpressionStmtObj, FallthroughStmtObj, ForStmtObj, GoStmtObj, GotoStmtObj, IdentObj, IfStmtObj, IncStmtObj, ReturnStmtObj, SelectStmtObj, StmtObj, SwitchStmtObj, makeDecStmt, makeUnaryExpr } from "../parser";
import { compileTagObj } from "./compileFn";
import { ProgramFile } from "./model";
import { AnyStmtObj, AnyTagObj, addLabelIfExist, assertTagObj, isStmtObj } from "./utils";




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
    assertTagObj<ExprObj>(unaryExprObj)
    compileTagObj(unaryExprObj, pf)
  },

  "DEC": (s,pf) => {
    assertTagObj<DecStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)
    compileTagObj(makeUnaryExpr(s.expr, "--") as ExprObj, pf)
  },

  "ASSIGN": (s,pf) => {
    assertTagObj<AssignmentStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)
    if( s.op === ":="){
      compileTagObj(makeDecStmt(s.lhs) as StmtObj, pf)
    }

    compileTagObj(s.lhs, pf)
    compileTagObj(s.rhs, pf)
    pf.instructions.push(new AssignInstruction())
  },


  "IF": (s,pf) => {
    assertTagObj<IfStmtObj>(s)
    addLabelIfExist(pf.instructions.length, s.label, pf)

    pf.instructions.push(new EnterScopeInstruction())
    if(s.pre !== undefined){
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
    
    if(s.elseBody !== undefined){
      console.log(s.elseBody)
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
    if(s.pre !== undefined){
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
    if(s.pre !== undefined){
      compileTagObj(s.pre,pf)
    }

    let startPc = pf.instructions.length

    if(s.cond !== undefined){
      compileTagObj(s.cond,pf)
      pf.instructions.push(new JofInstruction(pf.instructions.length + 1))
      pf.instructions.push(new GotoInstruction(0))
      predGotoPc = pf.instructions.length - 1
    }

    s.body.stmts.forEach((bodyStmt) => {
      compileTagObj(bodyStmt,pf)
    }) 

    if (s.post !== undefined) {
      compileTagObj(s.post,pf)
    }

    pf.instructions.push(new GotoInstruction(startPc))
    if (predGotoPc !== -1) {
      pf.instructions[predGotoPc] = new GotoInstruction(pf.instructions.length)
    }

    pf.instructions.push(new ExitScopeInstruction())
  },

  "BREAK": (s,pf) => {

  },

  "CONTINUE": (s,pf) => {

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

  // Add more functions as needed
};
