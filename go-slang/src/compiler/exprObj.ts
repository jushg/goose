import { CompiledFile } from "../common/compileFile";
import {
  makeCallInstruction,
  makeLdInstruction,
  makeLdcInstruction,
  makeSysCallInstruction,
} from "../common/instructionObj";
import { ExprObj } from "../parser";
import { sysCallLogic } from "../virtual_machine/sysCalls";
import { compileTagObj } from "./compileFunc";
import { AnyTagObj, assertTag } from "./utils";

export function getExprLogic(
  key: ExprObj["tag"]
): (s: AnyTagObj, pf: CompiledFile) => void {
  switch (key) {
    case "CALL":
      return (s, pf) => {
        assertTag("CALL", s);
        s.args.map((arg) => compileTagObj(arg, pf));
        compileTagObj(s.func, pf);
        pf.instructions.push(makeCallInstruction(s.args.length));
      };

    case "IDENT":
      return (s, pf) => {
        assertTag("IDENT", s);
        pf.instructions.push(makeLdInstruction(s.val));
      };

    case "LITERAL":
      return (s, pf) => {
        assertTag("LITERAL", s);
        pf.instructions.push(makeLdcInstruction(s));
      };

    case "SELECTOR":
      return (s, pf) => {
        throw new Error("Not implemented");
      };

    case "INDEX":
      return (s, pf) => {
        throw new Error("Not implemented");
      };

    case "UNARY_EXPR":
      return (s, pf) => {
        assertTag("UNARY_EXPR", s);
        compileTagObj(s.expr, pf);
        pf.instructions.push(makeLdInstruction(s.op));
        pf.instructions.push(makeCallInstruction(1));
      };

    case "BINARY_EXPR":
      return (s, pf) => {
        assertTag("BINARY_EXPR", s);
        compileTagObj(s.rhs, pf);
        compileTagObj(s.lhs, pf);

        pf.instructions.push(makeLdInstruction(s.op));
        pf.instructions.push(makeCallInstruction(2));
      };

    case "SYS_CALL":
      return (s, pf) => {
        assertTag("SYS_CALL", s);
        const { type, args } = s;

        if (!(s.sym in sysCallLogic)) {
          throw new Error(`Unsupported sysCall: ${s.sym}`);
        }
        const sym = s.sym as keyof typeof sysCallLogic;

        s.args.map((arg) => compileTagObj(arg, pf));
        pf.instructions.push(makeSysCallInstruction(sym, type, args.length));
      };

    default: {
      const _: never = key;
      throw new Error(`Unsupported expr type: ${key}`);
    }
  }
}
