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
  AssignmentStmtObj,
  BreakStmtObj,
  ChanStmtObj,
  ConstDeclObj,
  ContStmtObj,
  DecStmtObj,
  ExpressionStmtObj,
  ForStmtObj,
  FuncDeclObj,
  IdentObj,
  IfStmtObj,
  IncStmtObj,
  NilTypeObj,
  ReturnStmtObj,
  StmtObj,
  SwitchStmtObj,
  VarDeclObj,
  makeAssignmentStmt,
  makeFunctionType,
  makeUnaryExpr,
  makeVarDecl,
} from "../parser";

import { compileTagObj } from "./compileFn";
import { ProgramFile } from "./model";
import { AnyStmtObj, addLabelIfExist, assertTagObj, isStmtObj } from "./utils";

export const smtMap: {
  [key: string]: (s: AnyStmtObj, pf: ProgramFile) => void;
} = {
  EXPR: (s, pf) => {
    assertTagObj<ExpressionStmtObj>(s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    compileTagObj(s.expr, pf);
  },
  SEND: (s, pf) => {
    assertTagObj<ChanStmtObj>(s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    compileTagObj(s.lhs, pf);
    compileTagObj(s.rhs, pf);
    // TODO: Add SendInstruction
  },

  INC: (s, pf) => {
    assertTagObj<IncStmtObj>(s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    let unaryExprObj = makeUnaryExpr(s.expr, "++");
    compileTagObj(unaryExprObj, pf);
  },

  DEC: (s, pf) => {
    assertTagObj<DecStmtObj>(s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    let unaryExprObj = makeUnaryExpr(s.expr, "--");
    compileTagObj(unaryExprObj, pf);
  },

  ASSIGN: (s, pf) => {
    assertTagObj<AssignmentStmtObj>(s);
    addLabelIfExist(pf.instructions.length, s.label, pf);
    if (s.op === ":=") {
      assertTagObj<IdentObj>(s.lhs);
      let placeHolderType: NilTypeObj = { tag: "TYPE", type: { base: "NIL" } };
      compileTagObj(makeVarDecl(s.lhs, placeHolderType, s.rhs), pf);
    } else {
      compileTagObj(s.lhs, pf);
      compileTagObj(s.rhs, pf);
      pf.instructions.push(makeAssignInstruction());
    }
  },

  IF: (s, pf) => {
    assertTagObj<IfStmtObj>(s);
    addLabelIfExist(pf.instructions.length, s.label, pf);

    pf.instructions.push(makeEnterScopeInstruction());
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
      if (isStmtObj(s.elseBody)) {
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
    assertTagObj<SwitchStmtObj>(s);
    addLabelIfExist(pf.instructions.length, s.label, pf);

    pf.instructions.push(makeEnterScopeInstruction());

    if (s.pre !== null) {
      compileTagObj(s.pre, pf);
    }

    compileTagObj(s.cond, pf);

    // TODO: Add JofInstruction and figure this out

    pf.instructions.push(makeExitScopeInstruction());
  },

  SELECT: (s, pf) => {},
  FOR: (s, pf) => {
    assertTagObj<ForStmtObj>(s);
    let predGotoPc = -1;

    addLabelIfExist(pf.instructions.length, s.label, pf);
    pf.instructions.push(makeEnterScopeInstruction());
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
    assertTagObj<BreakStmtObj>(s);

    // TODO: Add exit label once we support that
    pf.instructions.push(makeExitScopeInstruction());
  },

  CONTINUE: (s, pf) => {
    assertTagObj<ContStmtObj>(s);
    pf.instructions.push(makeExitScopeInstruction());
  },

  GOTO: (s, pf) => {},

  FALLTHROUGH: (s, pf) => {},
  DEFER: (s, pf) => {},

  GO: (s, pf) => {},

  RETURN: (s, pf) => {
    assertTagObj<ReturnStmtObj>(s);
    compileTagObj(s.expr, pf);
    // TODO: add exit label once we support that
    pf.instructions.push(makeExitScopeInstruction());
  },

  FUNC_DECL: (s, pf) => {
    assertTagObj<FuncDeclObj>(s);
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
    assertTagObj<VarDeclObj>(s);
    pf.instructions.push(makeDeclareInstruction(s.ident.val, s.type));
    if (s.val !== null) {
      let assignStmt = makeAssignmentStmt(s.ident, "=", s.val);
      compileTagObj(assignStmt, pf);
    }
  },

  CONST_DECL: (s, pf) => {
    assertTagObj<ConstDeclObj>(s);
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
