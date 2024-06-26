import {
  InstrAddr,
  OpCode,
  SysCallInstructionObj,
  assertOpType,
  makeAssignInstruction,
  makeCallInstruction,
  makeDeclareInstruction,
  makeEnterScopeInstruction,
  makeExitScopeInstruction,
  makeGOTOInstruction,
  makeGoroutineInstruction,
  makeJOFInstruction,
  makeLdInstruction,
  makeLdcInstruction,
  makeSysCallInstruction,
} from "../common/instructionObj";
import {
  AnyLiteralObj,
  AnyTypeObj,
  FuncLiteralObj,
  NilTypeObj,
  StmtObj,
  makeAssignmentStmt,
  makeBoolLiteral,
  makeFunctionType,
  makeUnaryExpr,
  makeVarDecl,
} from "../parser";

import { CompiledFile } from "../common/compiledFile";
import { compileTagObj } from "./compileFunc";
import {
  addLabelIfExist,
  assertStmt,
  assertTag,
  scanDeclaration,
} from "./utils";
import { channelBuiltins } from "../virtual_machine/builtins";

export function getStmtLogic(
  key: StmtObj["stmtType"]
): (s: StmtObj, pf: CompiledFile) => void {
  switch (key) {
    case "BLOCK":
      return (s, pf) => {
        assertStmt("BLOCK", s);
        let decls = scanDeclaration(s.stmts);
        pf.instructions.push(makeEnterScopeInstruction(decls));
        s.stmts.forEach((stmt) => {
          compileTagObj(stmt, pf);
        });
        pf.instructions.push(makeExitScopeInstruction());
      };

    case "EXPR":
      return (s, pf) => {
        assertStmt("EXPR", s);
        addLabelIfExist(pf.instructions.length, s.label, pf);
        compileTagObj(s.expr, pf);
      };

    case "SEND":
      return (s, pf) => {
        assertStmt("SEND", s);
        addLabelIfExist(pf.instructions.length, s.label, pf);
        compileTagObj(s.lhs, pf);
        compileTagObj(s.rhs, pf);
        pf.instructions.push(
          makeLdInstruction(channelBuiltins.chanSend.fnName)
        );
        pf.instructions.push(
          makeCallInstruction(channelBuiltins.chanSend.argCount)
        );
      };

    case "INC":
      return (s, pf) => {
        assertStmt("INC", s);
        addLabelIfExist(pf.instructions.length, s.label, pf);

        const converted = makeAssignmentStmt(s.expr, "=", {
          tag: "BINARY_EXPR",
          op: "+",
          lhs: s.expr,
          rhs: {
            tag: "LITERAL",
            type: { tag: "TYPE", type: { base: "INT" } },
            val: 1,
          },
        });
        compileTagObj(converted, pf);
      };

    case "DEC":
      return (s, pf) => {
        assertStmt("DEC", s);
        addLabelIfExist(pf.instructions.length, s.label, pf);

        const converted = makeAssignmentStmt(s.expr, "=", {
          tag: "BINARY_EXPR",
          op: "-",
          lhs: s.expr,
          rhs: {
            tag: "LITERAL",
            type: { tag: "TYPE", type: { base: "INT" } },
            val: 1,
          },
        });
        compileTagObj(converted, pf);
      };

    case "ASSIGN":
      return (s, pf) => {
        assertStmt("ASSIGN", s);
        addLabelIfExist(pf.instructions.length, s.label, pf);
        if (s.op === ":=") {
          assertTag("IDENT", s.lhs);
          let placeHolderType: NilTypeObj = {
            tag: "TYPE",
            type: { base: "NIL" },
          };
          compileTagObj(makeVarDecl(s.lhs, placeHolderType, s.rhs), pf);
        } else {
          compileTagObj(s.rhs, pf);
          compileTagObj(s.lhs, pf);
          pf.instructions.push(makeAssignInstruction());
        }
      };

    case "IF":
      return (s, pf) => {
        assertStmt("IF", s);
        addLabelIfExist(pf.instructions.length, s.label, pf);

        // This is the only content of the stmt as the if clause and else clause
        // both have their own scopes.
        let decls = scanDeclaration(s.pre === null ? [] : [s.pre]);
        pf.instructions.push(makeEnterScopeInstruction(decls));

        if (s.pre !== null) {
          compileTagObj(s.pre, pf);
        }

        compileTagObj(s.cond, pf);
        pf.instructions.push(makeJOFInstruction(new InstrAddr(0)));

        let jofPc = pf.instructions.length - 1;

        compileTagObj(s.body, pf);
        pf.instructions.push(makeGOTOInstruction(new InstrAddr(0)));
        let gotoPc = pf.instructions.length - 1;

        pf.instructions[jofPc] = makeJOFInstruction(
          new InstrAddr(pf.instructions.length)
        );

        if (s.elseBody !== null) {
          compileTagObj(s.elseBody, pf);
        }
        pf.instructions[gotoPc] = makeGOTOInstruction(
          new InstrAddr(pf.instructions.length)
        );
        pf.instructions.push(makeExitScopeInstruction());
      };

    case "SWITCH":
      return (s, pf) => {
        assertStmt("SWITCH", s);
        addLabelIfExist(pf.instructions.length, s.label, pf);

        let decls = scanDeclaration(s.pre === null ? [] : [s.pre]);
        pf.instructions.push(makeEnterScopeInstruction(decls, "FOR"));

        if (s.pre !== null) {
          compileTagObj(s.pre, pf);
        }

        compileTagObj(s.cond, pf);

        throw new Error("SWITCH not implemented");
        pf.instructions.push(makeExitScopeInstruction("FOR"));
      };

    case "SELECT":
      return (s, pf) => {
        throw new Error("SELECT not implemented");
      };

    case "FOR":
      return (s, pf) => {
        assertStmt("FOR", s);
        let predJofPc = -1;
        let endJofPc = -1;

        // Note that the body has its own block to allow for redeclaration.

        // Logic to exit the loop properly
        pf.instructions.push(makeLdcInstruction(makeBoolLiteral(true)));

        let decls = scanDeclaration(
          [s.pre, s.post].filter((x: StmtObj | null) => x !== null) as StmtObj[]
        );

        addLabelIfExist(pf.instructions.length, s.label, pf);
        pf.instructions.push(makeEnterScopeInstruction(decls, "FOR"));

        // Logic to exit the loop properly
        pf.instructions.push(makeJOFInstruction(new InstrAddr(0)));
        endJofPc = pf.instructions.length - 1;

        if (s.pre !== null) {
          compileTagObj(s.pre, pf);
        }

        let startPc = pf.instructions.length;

        if (s.cond !== null) {
          compileTagObj(s.cond, pf);
          pf.instructions.push(makeJOFInstruction(new InstrAddr(0)));
          predJofPc = pf.instructions.length - 1;
        }

        compileTagObj(s.body, pf);

        if (s.post !== null) {
          compileTagObj(s.post, pf);
        }

        pf.instructions.push(makeGOTOInstruction(new InstrAddr(startPc)));
        if (predJofPc !== -1) {
          pf.instructions[predJofPc] = makeJOFInstruction(
            new InstrAddr(pf.instructions.length)
          );
        }

        pf.instructions.push(makeLdcInstruction(makeBoolLiteral(false))); // False to let JOF break
        pf.instructions.push(makeExitScopeInstruction("FOR"));

        pf.instructions[endJofPc] = makeJOFInstruction(
          new InstrAddr(pf.instructions.length)
        );
      };

    case "BREAK":
      return (s, pf) => {
        assertStmt("BREAK", s);
        pf.instructions.push(makeLdcInstruction(makeBoolLiteral(false))); // False to break
        pf.instructions.push(makeExitScopeInstruction("FOR"));
      };

    case "CONTINUE":
      return (s, pf) => {
        assertStmt("CONTINUE", s);
        pf.instructions.push(makeLdcInstruction(makeBoolLiteral(true))); // True to continue
        pf.instructions.push(makeExitScopeInstruction("FOR"));
      };

    case "GOTO":
      return (s, pf) => {
        throw new Error("GOTO not implemented");
      };

    case "FALLTHROUGH":
      return (s, pf) => {
        throw new Error("FALLTHROUGH not implemented");
      };

    case "DEFER":
      return (s, pf) => {
        throw new Error("DEFER not implemented");
      };

    case "GO":
      return (s, pf) => {
        assertStmt("GO", s);

        const { expr } = s;
        assertTag("CALL", expr);
        compileTagObj(expr, pf);

        const callInstr = pf.instructions.pop()!;
        assertOpType(OpCode.CALL, callInstr);

        pf.instructions.push(makeGoroutineInstruction(callInstr.args));
        // main thread will automatically create new goroutine to continue with callInstr
        // with a duplicated OS. The main thread will continue with instructions after
        // skipping 'callInstr' and the sys call 'done'.

        pf.instructions.push(callInstr);
        pf.instructions.push(makeSysCallInstruction("done", null, 0));
      };

    case "RETURN":
      return (s, pf) => {
        assertStmt("RETURN", s);
        if (s.expr) compileTagObj(s.expr, pf);
        pf.instructions.push(makeExitScopeInstruction("CALL"));
      };

    case "FUNC_DECL":
      return (s, pf) => {
        assertStmt("FUNC_DECL", s);
        pf.instructions.push(makeDeclareInstruction(s.ident.val, s.lit.type));

        compileTagObj(s.lit satisfies FuncLiteralObj, pf);
        pf.instructions.push(makeLdInstruction(s.ident.val));
        pf.instructions.push(makeAssignInstruction());
      };

    case "VAR_DECL":
      return (s, pf) => {
        assertStmt("VAR_DECL", s);
        pf.instructions.push(makeDeclareInstruction(s.ident.val, s.type));
        if (s.val !== null) {
          let assignStmt = makeAssignmentStmt(s.ident, "=", s.val);
          compileTagObj(assignStmt, pf);
        }
      };

    case "CONST_DECL":
      return (s, pf) => {
        assertStmt("CONST_DECL", s);
        pf.instructions.push(
          makeDeclareInstruction(
            s.ident.val,
            s.type === null ? (s.val as AnyLiteralObj).type : s.type
          )
        );
        let assignStmt = makeAssignmentStmt(s.ident, "=", s.val);
        compileTagObj(assignStmt, pf);
      };

    default: {
      const _: never = key;
      throw new Error(`Unsupported stmtType: ${key}`);
    }
    // Add more functions as needed
  }
}
