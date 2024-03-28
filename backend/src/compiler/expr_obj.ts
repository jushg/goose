import { AnyLiteralObj, BinaryExprObj, CallObj, ExprObj, IdentObj, IndexObj, MakeCallObj, NewCallObj, SelectorObj, StmtObj, UnaryExprObj } from "../parser";
import { ProgramFile } from "./model";
import { CallInstruction, LdInstruction } from "../instruction";


export function compileExprObj(obj: ExprObj, pf: ProgramFile) {
  smtMap[obj.tag](obj, pf)
}

const smtMap: { [key: string]: (s: ExprObj, pf: ProgramFile) => void} = {
  
  
  "CALL": (s,pf) => {
    const obj = s as CallObj
    obj.args.map(arg => compileExprObj(arg, pf))
    compileExprObj(obj.func, pf)
    pf.instructions.push(new CallInstruction(obj.args.length))
  },

  "IDENT": (s,pf) => {
    const obj = s as IdentObj
    pf.instructions.push(new LdInstruction(obj.val))

  },

  "LITERAL": (s,pf) => {
    const obj = s as AnyLiteralObj
   
  },


  "SELECTOR": (s,pf) => {
    const obj = s as SelectorObj
   
  },


  "INDEX": (s,pf) => {
    const obj = s as IndexObj
   
  },


  "UNARY_EXPR": (s,pf) => {
    const obj = s as UnaryExprObj
    compileExprObj(obj.expr, pf)
    pf.instructions.push(new LdInstruction(obj.op))
    pf.instructions.push(new CallInstruction(1))
  },


  "BINARY_EXPR": (s,pf) => {
    const obj = s as BinaryExprObj
    //Check this ordering
    compileExprObj(obj.lhs, pf)
    compileExprObj(obj.rhs, pf)
    pf.instructions.push(new LdInstruction(obj.op))
    pf.instructions.push(new CallInstruction(2))
  },

  "MAKE": (s,pf) => {
    const obj = s as MakeCallObj
   
  },

  "New": (s,pf) => {
    const obj = s as NewCallObj
   
  }
}