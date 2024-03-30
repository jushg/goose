import { AssignInstruction, DeclareInstruction, EnterScopeInstruction, ExitScopeInstruction, GotoInstruction, JofInstruction } from "../instruction";
import { AssignmentStmtObj, BlockObj, BreakStmtObj, ChanStmtObj, ContStmtObj, DecStmtObj, DeferStmtObj, ExprObj, ExpressionStmtObj, FallthroughStmtObj, ForStmtObj, GoStmtObj, GotoStmtObj, IfStmtObj, IncStmtObj, ReturnStmtObj, SelectStmtObj, StmtObj, SwitchStmtObj, makeDecStmt } from "../parser";
import { compileExprObj } from "./expr_obj";
import { ProgramFile } from "./model";



export function compileStmt(s: StmtObj, pf: ProgramFile) {
  smtMap[s.tag](s,pf)
}

const smtMap: { [key: string]: (s: StmtObj, pf: ProgramFile) => void} = {
  "EXPR": (s,pf) => {
    const stmt = s as ExpressionStmtObj
    addLabelIfExist(pf.instructions.length, stmt.label, pf)
    compileExprObj(stmt.expr, pf)
  },
  "SEND": (s,pf) => {
    const stmt = s as ChanStmtObj
    addLabelIfExist(pf.instructions.length, stmt.label, pf)
    compileExprObj(stmt.lhs, pf)
    compileExprObj(stmt.rhs, pf)


  },

  "INC": (s,pf) => {
    const stmt = s as IncStmtObj
    addLabelIfExist(pf.instructions.length, stmt.label, pf)
  },

  "DEC": (s,pf) => {
    const stmt = s as DecStmtObj
    addLabelIfExist(pf.instructions.length, stmt.label, pf)
    pf.instructions.push(new DeclareInstruction())
    compileExprObj(stmt.expr, pf)
  },

  "ASSIGN": (s,pf) => {
    const stmt = s as AssignmentStmtObj
    addLabelIfExist(pf.instructions.length, stmt.label, pf)
    if( stmt.op === ":="){
      compileStmt(makeDecStmt(stmt.lhs) as StmtObj, pf)
    }

    compileExprObj(stmt.lhs, pf)
    compileExprObj(stmt.rhs, pf)
    pf.instructions.push(new AssignInstruction())
  },


  "IF": (s,pf) => {
    const stmt = s as IfStmtObj
    addLabelIfExist(pf.instructions.length, stmt.label, pf)

    pf.instructions.push(new EnterScopeInstruction())
    if(stmt.pre !== undefined){
      compileExprObj(stmt.pre,pf)
    }
    compileExprObj(stmt.cond,pf)
    pf.instructions.push(new JofInstruction(0))

    let jofPc = pf.instructions.length - 1

    stmt.body.stmts.forEach((bodyStmt) => {
      compileStmt(bodyStmt,pf)
    }) 

    pf.instructions.push(new GotoInstruction(0))
    let gotoPc = pf.instructions.length - 1
    pf.instructions[jofPc] = new JofInstruction(pf.instructions.length)
    
    if(stmt.elseBody !== undefined){
      if (stmt.elseBody.tag === "STMT") {
        compileStmt(stmt.elseBody,pf)
      } else {
        stmt.elseBody.stmts.forEach((elseBodyStmt) => {
          compileStmt(elseBodyStmt,pf)
        })
      }
    }
    pf.instructions[gotoPc] = new GotoInstruction(pf.instructions.length)
    pf.instructions.push(new ExitScopeInstruction())
  },

  "SWITCH": (s,pf) => {
    const stmt = s as SwitchStmtObj
    addLabelIfExist(pf.instructions.length, stmt.label, pf)

    pf.instructions.push(new EnterScopeInstruction())
    if(stmt.pre !== undefined){
      compileExprObj(stmt.pre,pf)
    }

    compileExprObj(stmt.cond,pf)

    // TODO: Add JofInstruction and figure this out



    pf.instructions.push(new ExitScopeInstruction())
  },

  "SELECT": (s,pf) => {
    const stmt = s as SelectStmtObj
    
  },
  "FOR": (s,pf) => {
    const stmt = s as ForStmtObj
    let predGotoPc = -1

    addLabelIfExist(pf.instructions.length, stmt.label, pf)
    pf.instructions.push(new EnterScopeInstruction())
    if(stmt.pre !== undefined){
      compileStmt(stmt.pre,pf)
    }

    let startPc = pf.instructions.length

    if(stmt.cond !== undefined){
      compileExprObj(stmt.cond,pf)
      pf.instructions.push(new JofInstruction(pf.instructions.length + 1))
      pf.instructions.push(new GotoInstruction(0))
      predGotoPc = pf.instructions.length - 1
    }

    stmt.body.stmts.forEach((bodyStmt) => {
      compileStmt(bodyStmt,pf)
    }) 

    if (stmt.post !== undefined) {
      compileStmt(stmt.post,pf)
    }

    pf.instructions.push(new GotoInstruction(startPc))
    if (predGotoPc !== -1) {
      pf.instructions[predGotoPc] = new GotoInstruction(pf.instructions.length)
    }

    pf.instructions.push(new ExitScopeInstruction())
  },

  "BREAK": (s,pf) => {
    const stmt = s as BreakStmtObj

  },

  "CONTINUE": (s,pf) => {
    const stmt = s as ContStmtObj
  },

  "GOTO": (s,pf) => {
    const stmt = s as GotoStmtObj
  },

  "FALLTHROUGH": (s,pf) => {
    const stmt = s as FallthroughStmtObj
  },
  "DEFER": (s,pf) => {
    const stmt = s as DeferStmtObj
  },

  "GO": (s,pf) => {
    const stmt = s as GoStmtObj
  },

  "RETURN": (s,pf) => {
    const stmt = s as ReturnStmtObj
  },

  "BLOCK": (s,pf) => {
    const stmt = s as BlockObj
    pf.instructions.push(new EnterScopeInstruction())
    stmt.stmts.forEach((blockStmt) => {
      compileStmt(blockStmt,pf)
    })
    pf.instructions.push(new ExitScopeInstruction())
  }
  
  // Add more functions as needed
};


function addLabelIfExist(pc: number, label: string | undefined, pf: ProgramFile) {
  if (label !== undefined) {
      pf.labelMap[label as string] = pc
  }
}

