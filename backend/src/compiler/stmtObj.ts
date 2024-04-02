import {
  InstrAddr,
  makeAssignInstruction,
  makeDeclareInstruction,
  makeEnterScopeInstruction,
  makeExitScopeInstruction,
  makeGOTOInstruction,
  makeJOFInstruction,
} from "../common/instructionObj";
import {
  AnyLiteralObj,
  NilTypeObj,
  StmtObj,
  makeAssignmentStmt,
  makeFunctionType,
  makeUnaryExpr,
  makeVarDecl,
} from "../parser";

import { CompiledFile } from "../common/compileFile";
import {
  addLabelIfExist,
  assertStmt,
  assertTag,
  isTag,
  scanDeclaration,
} from "./utils";
import { compileTagObj } from "./compileFunc";

export const smtMap: {
  [key: string]: (s: StmtObj, pf: CompiledFile) => void;
} = {
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
    // TODO: Add SendInstruction
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

    let ifScopeStmts = s.body.stmts;
    if (s.pre !== null) {
      // ifScopeStmts.push(s.pre);
    }
    if (s.elseBody !== null && isTag("BLOCK", s.elseBody)) {
      ifScopeStmts.concat(s.elseBody.stmts);
    }
    let decls = scanDeclaration(ifScopeStmts);

    pf.instructions.push(makeEnterScopeInstruction(decls));
    if (s.pre !== null) {
      compileTagObj(s.pre, pf);
    }
    compileTagObj(s.cond, pf);
    pf.instructions.push(makeJOFInstruction(new InstrAddr(0)));

    let jofPc = pf.instructions.length - 1;

    s.body.stmts.forEach((bodyStmt) => {
      compileTagObj(bodyStmt, pf);
    });

    pf.instructions.push(makeGOTOInstruction(new InstrAddr(0)));
    let gotoPc = pf.instructions.length - 1;
    pf.instructions[jofPc] = makeJOFInstruction(
      new InstrAddr(pf.instructions.length)
    );

    if (s.elseBody !== null) {
      if (isTag("STMT", s.elseBody)) {
        compileTagObj(s.elseBody, pf);
      } else {
        s.elseBody.stmts.forEach((elseBodyStmt) => {
          compileTagObj(elseBodyStmt, pf);
        });
      }
    }
    pf.instructions[gotoPc] = makeGOTOInstruction(
      new InstrAddr(pf.instructions.length)
    );
    pf.instructions.push(makeExitScopeInstruction());
  },

  SWITCH: (s, pf) => {
    assertStmt("SWITCH", s);
    addLabelIfExist(pf.instructions.length, s.label, pf);

    pf.instructions.push(makeEnterScopeInstruction([]));

    if (s.pre !== null) {
      compileTagObj(s.pre, pf);
    }

    compileTagObj(s.cond, pf);

    // TODO: Add JofInstruction and figure this out

    pf.instructions.push(makeExitScopeInstruction());
  },

  SELECT: (s, pf) => {
    throw new Error("SELECT not implemented");
  },
  FOR: (s, pf) => {
    assertStmt("FOR", s);
    let predGotoPc = -1;

    let forBodyStmts = s.body.stmts;
    if (s.pre !== null) {
      forBodyStmts.push(s.pre);
    }

    let decls = scanDeclaration(forBodyStmts);

    addLabelIfExist(pf.instructions.length, s.label, pf);
    pf.instructions.push(makeEnterScopeInstruction(decls));
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

    s.body.stmts.forEach((bodyStmt) => {
      compileTagObj(bodyStmt, pf);
    });

    if (s.post !== null) {
      compileTagObj(s.post, pf);
    }

    pf.instructions.push(makeGOTOInstruction(new InstrAddr(startPc)));
    if (predGotoPc !== -1) {
      pf.instructions[predGotoPc] = makeGOTOInstruction(
        new InstrAddr(pf.instructions.length)
      );
    }

    pf.instructions.push(makeExitScopeInstruction());
  },

  BREAK: (s, pf) => {
    assertStmt("BREAK", s);

    // TODO: Add exit label once we support that
    pf.instructions.push(makeExitScopeInstruction());
  },

  CONTINUE: (s, pf) => {
    assertStmt("CONTINUE", s);
    pf.instructions.push(makeExitScopeInstruction());
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
    // TODO: add exit label once we support that
    pf.instructions.push(makeExitScopeInstruction());
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
    let declStart = pf.instructions.length;
    compileTagObj(s.body, pf);
    let declEnd = pf.instructions.length;

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
