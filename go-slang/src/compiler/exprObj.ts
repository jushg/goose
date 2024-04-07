import { CompiledFile } from "../common/compiledFile";
import {
  InstrAddr,
  OpCode,
  SysCallInstructionObj,
  makeAssignInstruction,
  makeBinaryAluInstruction,
  makeCallInstruction,
  makeDeclareInstruction,
  makeEnterScopeInstruction,
  makeExitScopeInstruction,
  makeGOTOInstruction,
  makeLdInstruction,
  makeLdcInstruction,
  makeSysCallInstruction,
  makeUnaryAluInstruction,
} from "../common/instructionObj";
import { AnyLiteralObj, AnyTypeObj, ExprObj, FuncLiteralObj } from "../parser";
import { sysCallLogic } from "../virtual_machine/sysCalls";
import { compileTagObj } from "./compileFunc";
import { AnyTagObj, assertTag, scanDeclaration } from "./utils";

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

        if (s.type.type.base !== "FUNC")
          return pf.instructions.push(
            makeLdcInstruction(s as Exclude<AnyLiteralObj, FuncLiteralObj>)
          );

        const fnLit = s as FuncLiteralObj;

        pf.instructions.push(makeGOTOInstruction(new InstrAddr(0)));
        const gotoPc = pf.instructions.length - 1;

        let argsDecls: [string, AnyTypeObj][] = fnLit.input.map((prm) => [
          prm.ident.val,
          prm.type,
        ]);
        let bodyDecls = scanDeclaration(fnLit.body.stmts);
        let decls = argsDecls.concat(bodyDecls);

        pf.instructions.push(makeEnterScopeInstruction(decls));

        [...fnLit.input].reverse().forEach((prm) => {
          pf.instructions.push(makeDeclareInstruction(prm.ident.val, prm.type));
          pf.instructions.push(makeLdInstruction(prm.ident.val));
          pf.instructions.push(makeAssignInstruction());
        });

        fnLit.body.stmts.forEach((bodyStmt) => {
          compileTagObj(bodyStmt, pf);
        });

        pf.instructions.push(makeExitScopeInstruction("CALL"));
        pf.instructions[gotoPc] = makeGOTOInstruction(
          new InstrAddr(pf.instructions.length)
        );

        // Assign symbol to lambda
        pf.instructions.push(
          makeLdcInstruction({
            tag: "LITERAL",
            val: gotoPc + 1,
            type: { tag: "TYPE", type: { base: "INT" } },
          })
        );

        // Inserts the lambda ptr (the fn "literal" in Gosling runtime)
        pf.instructions.push({
          tag: "INSTR",
          op: OpCode.SYS_CALL,
          sym: "makeLambda",
          argCount: 1,
          type: null,
        } satisfies SysCallInstructionObj);
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
        pf.instructions.push(makeUnaryAluInstruction(s.op));
      };

    case "BINARY_EXPR":
      return (s, pf) => {
        assertTag("BINARY_EXPR", s);
        compileTagObj(s.rhs, pf);
        compileTagObj(s.lhs, pf);

        pf.instructions.push(makeBinaryAluInstruction(s.op));
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
