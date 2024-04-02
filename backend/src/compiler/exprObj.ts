import {
  AnyLiteralObj,
  BinaryExprObj,
  CallObj,
  IdentObj,
  IndexObj,
  SelectorObj,
  UnaryExprObj,
} from "../parser";
import { CompiledFile } from "../common/compileFile";
import { AnyTagObj, assertTagObj } from "./utils";
import { compileTagObj } from "./compileFunc";
import {
  makeCallInstruction,
  makeLdInstruction,
  makeLdcInstruction,
} from "../common/instructionObj";

export const exprMap: {
  [key: string]: (s: AnyTagObj, pf: CompiledFile) => void;
} = {
  CALL: (s, pf) => {
    assertTagObj<CallObj>(s);
    s.args.map((arg) => compileTagObj(arg, pf));
    compileTagObj(s.func, pf);
    pf.instructions.push(makeCallInstruction(s.args.length));
  },

  IDENT: (s, pf) => {
    assertTagObj<IdentObj>(s);
    pf.instructions.push(makeLdInstruction(s.val));
  },

  LITERAL: (s, pf) => {
    assertTagObj<AnyLiteralObj>(s);
    pf.instructions.push(makeLdcInstruction(s));
  },

  SELECTOR: (s, pf) => {
    assertTagObj<SelectorObj>(s);
  },

  INDEX: (s, pf) => {
    assertTagObj<IndexObj>(s);
  },

  UNARY_EXPR: (s, pf) => {
    assertTagObj<UnaryExprObj>(s);
    compileTagObj(s.expr, pf);
    pf.instructions.push(makeLdInstruction(s.op));
    pf.instructions.push(makeCallInstruction(1));
  },

  BINARY_EXPR: (s, pf) => {
    assertTagObj<BinaryExprObj>(s);
    compileTagObj(s.rhs, pf);
    compileTagObj(s.lhs, pf);

    pf.instructions.push(makeLdInstruction(s.op));
    pf.instructions.push(makeCallInstruction(2));
  },

  MAKE: (s, pf) => {
    throw new Error("Not implemented");
  },

  New: (s, pf) => {
    throw new Error("Not implemented");
  },
};
