import { AnyLiteralObj, BinaryExprObj, CallObj, IdentObj,SelectorObj, UnaryExprObj } from "../parser";
import { ProgramFile } from "./model";
import { CallInstruction, LdInstruction } from "../instruction";
import { AnyTagObj, assertTagObj } from "./utils";
import { compileTagObj } from "./compileFn";




export const exprMap: { [key: string]: (s: AnyTagObj, pf: ProgramFile) => void} = {
  "CALL": (s,pf) => {
    assertTagObj<CallObj>(s)
    s.args.map(arg => compileTagObj(arg, pf))
    compileTagObj(s.func, pf)
    pf.instructions.push(new CallInstruction(s.args.length))
  },

  "IDENT": (s,pf) => {
    assertTagObj<IdentObj>(s)
    pf.instructions.push(new LdInstruction(s.val))
  },

  "LITERAL": (s,pf) => {
    assertTagObj<AnyLiteralObj>(s)
  },


  "SELECTOR": (s,pf) => {
    assertTagObj <SelectorObj>(s)
   
  },


  "INDEX": (s,pf) => {
   
  },


  "UNARY_EXPR": (s,pf) => {
    assertTagObj<UnaryExprObj>(s)
    compileTagObj(s.expr, pf)
    pf.instructions.push(new LdInstruction(s.op))
    pf.instructions.push(new CallInstruction(1))
  },


  "BINARY_EXPR": (s,pf) => {
    assertTagObj<BinaryExprObj>(s)
    //Check this ordering
    compileTagObj(s.lhs, pf)
    compileTagObj(s.rhs, pf)
    pf.instructions.push(new LdInstruction(s.op))
    pf.instructions.push(new CallInstruction(2))
  },

  "MAKE": (s,pf) => {
   
  },

  "New": (s,pf) => {
   
  }
}