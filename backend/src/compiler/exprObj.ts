import { CompiledFile } from "../common/compileFile";
import {
  makeCallInstruction,
  makeLdInstruction,
  makeLdcInstruction,
} from "../common/instructionObj";
import { compileTagObj } from "./compileFunc";
import { AnyTagObj, assertTag } from "./utils";

export const exprMap: {
  [key: string]: (s: AnyTagObj, pf: CompiledFile) => void;
} = {
  CALL: (s, pf) => {
    assertTag("CALL", s);
    s.args.map((arg) => compileTagObj(arg, pf));
    compileTagObj(s.func, pf);
    pf.instructions.push(makeCallInstruction(s.args.length));
  },

  IDENT: (s, pf) => {
    assertTag("IDENT", s);
    pf.instructions.push(makeLdInstruction(s.val));
  },

  LITERAL: (s, pf) => {
    assertTag("LITERAL", s);
    pf.instructions.push(makeLdcInstruction(s));
  },

  SELECTOR: (s, pf) => {
    throw new Error("Not implemented");
  },

  INDEX: (s, pf) => {
    throw new Error("Not implemented");
  },

  UNARY_EXPR: (s, pf) => {
    assertTag("UNARY_EXPR", s);
    compileTagObj(s.expr, pf);
    pf.instructions.push(makeLdInstruction(s.op));
    pf.instructions.push(makeCallInstruction(1));
  },

  BINARY_EXPR: (s, pf) => {
    assertTag("BINARY_EXPR", s);
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
