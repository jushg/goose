import {
  InstrAddr,
  makeAssignInstruction,
  makeDeclareInstruction,
  makeEnterScopeInstruction,
  makeExitScopeInstruction,
  makeGOTOInstruction,
  makeJOFInstruction,
  makeLdInstruction,
} from "../common/instructionObj";
import {
  AnyLiteralObj,
  AnyTypeObj,
  NilTypeObj,
  StmtObj,
  makeAssignmentStmt,
  makeFunctionType,
  makeUnaryExpr,
  makeVarDecl,
} from "../parser";

import { CompiledFile } from "../common/compileFile";
import { compileTagObj } from "./compileFunc";
import {
  addLabelIfExist,
  assertStmt,
  assertTag,
  scanDeclaration,
} from "./utils";

export const smtMap: {
  [key in StmtObj["stmtType"]]: (s: StmtObj, pf: CompiledFile) => void;
} = {
  BLOCK: (s, pf) => {
    assertStmt("BLOCK", s);
    let decls = scanDeclaration(s.stmts);
    pf.instructions.push(makeEnterScopeInstruction(decls));
    s.stmts.forEach((stmt) => {
      compileTagObj(stmt, pf);
    });
    pf.instructions.push(makeExitScopeInstruction());
  },
  EXPR: (s, pf) => {
    assertStmt("EXPR", s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    compileTagObj(s.expr, pf);
  },
  SEND: (s, pf) => {
    assertStmt("SEND", s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    compileTagObj(s.lhs, pf);
    compileTagObj(s.rhs, pf);
    throw new Error("SEND not implemented");
  },

  INC: (s, pf) => {
    assertStmt("INC", s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    let unaryExprObj = makeUnaryExpr(s.expr, "++");
    compileTagObj(unaryExprObj, pf);
  },

  DEC: (s, pf) => {
    assertStmt("DEC", s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    let unaryExprObj = makeUnaryExpr(s.expr, "--");
    compileTagObj(unaryExprObj, pf);
  },

  ASSIGN: (s, pf) => {
    assertStmt("ASSIGN", s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    if (s.op === ":=") {
      assertTag("IDENT", s.lhs);
      let placeHolderType: NilTypeObj = { tag: "TYPE", type: { base: "NIL" } };
      compileTagObj(makeVarDecl(s.lhs, placeHolderType, s.rhs), pf);
    } else {
      compileTagObj(s.lhs, pf);
      compileTagObj(s.rhs, pf);
      pf.instructions.push(makeAssignInstruction());
    }
  },

  IF: (s, pf) => {
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
  },

  SWITCH: (s, pf) => {
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
  },

  SELECT: (s, pf) => {
    throw new Error("SELECT not implemented");
  },
  FOR: (s, pf) => {
    assertStmt("FOR", s);
    let predGotoPc = -1;

    // Note that the body has its own block to allow for redeclaration.
    let decls = scanDeclaration(
      [s.pre, s.post].filter((x: StmtObj | null) => x !== null) as StmtObj[]
    );

    addLabelIfExist(pf.instructions.length, s.label, pf);
    pf.instructions.push(makeEnterScopeInstruction(decls, "FOR"));
    if (s.pre !== null) {
      compileTagObj(s.pre, pf);
    }

    let startPc = pf.instructions.length;

    if (s.cond !== null) {
      compileTagObj(s.cond, pf);
      pf.instructions.push(
        makeJOFInstruction(new InstrAddr(pf.instructions.length + 1))
      );
      pf.instructions.push(makeGOTOInstruction(new InstrAddr(0)));
      predGotoPc = pf.instructions.length - 1;
    }

    compileTagObj(s.body, pf);

    if (s.post !== null) {
      compileTagObj(s.post, pf);
    }

    pf.instructions.push(makeGOTOInstruction(new InstrAddr(startPc)));
    if (predGotoPc !== -1) {
      pf.instructions[predGotoPc] = makeGOTOInstruction(
        new InstrAddr(pf.instructions.length)
      );
    }

    pf.instructions.push(makeExitScopeInstruction("FOR"));
  },

  BREAK: (s, pf) => {
    assertStmt("BREAK", s);

    // TODO: Add exit label once we support that
    pf.instructions.push(makeExitScopeInstruction());
  },

  CONTINUE: (s, pf) => {
    assertStmt("CONTINUE", s);
    pf.instructions.push(makeExitScopeInstruction("FOR"));
  },

  GOTO: (s, pf) => {
    throw new Error("GOTO not implemented");
  },

  FALLTHROUGH: (s, pf) => {
    throw new Error("FALLTHROUGH not implemented");
  },
  DEFER: (s, pf) => {
    throw new Error("DEFER not implemented");
  },

  GO: (s, pf) => {
    throw new Error("GO not implemented");
  },

  RETURN: (s, pf) => {
    assertStmt("RETURN", s);
    compileTagObj(s.expr, pf);
    pf.instructions.push(makeExitScopeInstruction("CALL"));
  },

  FUNC_DECL: (s, pf) => {
    assertStmt("FUNC_DECL", s);
    pf.instructions.push(
      makeDeclareInstruction(
        s.ident.val,
        makeFunctionType(
          s.input.map((prm) => prm.type),
          s.returnT
        )
      )
    );
    pf.instructions.push(makeGOTOInstruction(new InstrAddr(0)));
    const gotoPc = pf.instructions.length - 1;

    let argsDecls: [string, AnyTypeObj][] = s.input.map((prm) => [
      prm.ident.val,
      prm.type,
    ]);
    let bodyDecls = scanDeclaration(s.body.stmts);
    let decls = argsDecls.concat(bodyDecls);

    pf.instructions.push(makeEnterScopeInstruction(decls));

    s.input.forEach((prm) => {
      pf.instructions.push(makeLdInstruction(prm.ident.val));
      pf.instructions.push(makeAssignInstruction());
    });

    s.body.stmts.forEach((bodyStmt) => {
      compileTagObj(bodyStmt, pf);
    });

    pf.instructions.push(makeExitScopeInstruction("CALL"));
    pf.instructions[gotoPc] = makeGOTOInstruction(
      new InstrAddr(pf.instructions.length)
    );

    // TODO: Create closure object here
  },

  VAR_DECL: (s, pf) => {
    assertStmt("VAR_DECL", s);
    pf.instructions.push(makeDeclareInstruction(s.ident.val, s.type));
    if (s.val !== null) {
      let assignStmt = makeAssignmentStmt(s.ident, "=", s.val);
      compileTagObj(assignStmt, pf);
    }
  },

  CONST_DECL: (s, pf) => {
    assertStmt("CONST_DECL", s);
    pf.instructions.push(
      makeDeclareInstruction(
        s.ident.val,
        s.type === null ? (s.val as AnyLiteralObj).type : s.type
      )
    );
    let assignStmt = makeAssignmentStmt(s.ident, "=", s.val);
    compileTagObj(assignStmt, pf);
  },

  // Add more functions as needed
};
