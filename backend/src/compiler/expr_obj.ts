import { AnyLiteralObj, BinaryExprObj, CallObj, ExprObj, IdentObj, IndexObj, MakeCallObj, NewCallObj, SelectorObj, StmtObj, UnaryExprObj, makeIdent } from "../parser";
import { ProgramFile } from "./model";
import { CallInstruction, LdInstruction, LdcInstruction } from "../instruction";
import { AnyTagObj, assertTagObj } from "./utils";


export function compileExprObj(obj: AnyTagObj, pf: ProgramFile) {
  smtMap[obj.tag](obj, pf)
}

const smtMap: { [key: string]: (s: AnyTagObj, pf: ProgramFile) => void} = {
  "CALL": (s,pf) => {
    assertTagObj<CallObj>(s)
    s.args.map(arg => compileExprObj(arg, pf))
    compileExprObj(s.func, pf)
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
    compileExprObj(s.expr, pf)
    pf.instructions.push(new LdInstruction(s.op))
    pf.instructions.push(new CallInstruction(1))
  },


  "BINARY_EXPR": (s,pf) => {
    assertTagObj<BinaryExprObj>(s)
    //Check this ordering
    compileExprObj(s.lhs, pf)
    compileExprObj(s.rhs, pf)
    pf.instructions.push(new LdInstruction(s.op))
    pf.instructions.push(new CallInstruction(2))
  },

  "MAKE": (s,pf) => {
   
  },

  "New": (s,pf) => {
   
  }
}