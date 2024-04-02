export type TypeObj<T> = { tag: "TYPE"; type: T };
export type BoolTypeObj = TypeObj<{ base: "BOOL" }>;
export type IntTypeObj = TypeObj<{ base: "INT" }>;
export type StrTypeObj = TypeObj<{ base: "STR" }>;
export type NilTypeObj = TypeObj<{ base: "NIL" }>;

export type PtrTypeObj<T> = TypeObj<{ base: "PTR"; inner: T }>;
export type ArrayTypeObj<T> = TypeObj<{ base: "ARRAY"; inner: T; len: any }>;
export type ChanTypeObj<T, M = "DUAL" | "IN" | "OUT"> = TypeObj<{
  base: "CHAN";
  inner: T;
  mode: M;
}>;
export type FuncTypeObj<I, O> = TypeObj<{
  base: "FUNC";
  inputT: I;
  returnT: O;
}>;

export type AnyTypeObj =
  | NilTypeObj
  | BoolTypeObj
  | IntTypeObj
  | StrTypeObj
  | PtrTypeObj<any>
  | ArrayTypeObj<any>
  | ChanTypeObj<any>
  | FuncTypeObj<any, any>;

function makeStringType(): StrTypeObj {
  return { tag: "TYPE", type: { base: "STR" } };
}
function makeBoolType(): BoolTypeObj {
  return { tag: "TYPE", type: { base: "BOOL" } };
}
function makeIntType(): IntTypeObj {
  return { tag: "TYPE", type: { base: "INT" } };
}
function makePtrType<T extends AnyTypeObj>(inner: T): PtrTypeObj<T> {
  return { tag: "TYPE", type: { base: "PTR", inner } };
}
function makeArrayType<T extends AnyTypeObj>(
  len: ExprObj,
  inner: T
): ArrayTypeObj<T> {
  return { tag: "TYPE", type: { base: "ARRAY", len, inner } };
}
function makeChanType<T extends AnyTypeObj, M extends "DUAL" | "IN" | "OUT">(
  inner: T,
  mode: M
): ChanTypeObj<T, M> {
  return { tag: "TYPE", type: { base: "CHAN", inner, mode } };
}
function makeChanDualType<T extends AnyTypeObj>(
  inner: T
): ChanTypeObj<T, "DUAL"> {
  return makeChanType(inner, "DUAL");
}
function makeChanInType<T extends AnyTypeObj>(inner: T): ChanTypeObj<T, "IN"> {
  return makeChanType(inner, "IN");
}
function makeChanOutType<T extends AnyTypeObj>(
  inner: T
): ChanTypeObj<T, "OUT"> {
  return makeChanType(inner, "OUT");
}
export function makeFunctionType<
  I extends AnyTypeObj[],
  O extends AnyTypeObj | null,
>(inputT: I, returnT: O): FuncTypeObj<I, O> {
  return { tag: "TYPE", type: { base: "FUNC", inputT, returnT } };
}

export type IdentObj = { tag: "IDENT"; val: string };
export function makeIdent(val: string): IdentObj {
  return { tag: "IDENT", val };
}

export type BlockObj = { tag: "BLOCK"; stmts: StmtObj[] };
function makeBlock(stmts: StmtObj[]): BlockObj {
  return { tag: "BLOCK", stmts };
}

export type ConstDeclObj = {
  tag: "STMT";
  stmtType: "CONST_DECL";
  ident: IdentObj;
  type: AnyTypeObj | null;
  val: ExprObj;
};
function makeConstDecl(
  ident: IdentObj,
  type: AnyTypeObj | null,
  val: ExprObj
): ConstDeclObj {
  return { tag: "STMT", stmtType: "CONST_DECL", ident, type, val };
}

export type VarDeclObj = {
  tag: "STMT";
  stmtType: "VAR_DECL";
  ident: IdentObj;
  type: AnyTypeObj;
  val: ExprObj | null;
};
export function makeVarDecl(
  ident: IdentObj,
  type: AnyTypeObj,
  val: ExprObj | null
): VarDeclObj {
  return { tag: "STMT", stmtType: "VAR_DECL", ident, type, val };
}

export type FuncDeclObj = {
  tag: "STMT";
  stmtType: "FUNC_DECL";
  ident: IdentObj;
  input: { ident: IdentObj; type: AnyTypeObj }[];
  returnT: AnyTypeObj | null;
  body: BlockObj;
};
function makeFuncDecl(
  ident: IdentObj,
  input: { ident: IdentObj; type: AnyTypeObj }[],
  returnT: AnyTypeObj | null,
  body: BlockObj
): FuncDeclObj {
  return { tag: "STMT", stmtType: "FUNC_DECL", ident, input, returnT, body };
}

export type BoolLiteralObj = {
  tag: "LITERAL";
  type: BoolTypeObj;
  val: boolean;
};
function makeBoolLiteral(val: boolean): BoolLiteralObj {
  return { tag: "LITERAL", type: { tag: "TYPE", type: { base: "BOOL" } }, val };
}

export type IntLiteralObj = { tag: "LITERAL"; type: IntTypeObj; val: number };
function makeIntLiteralObj(val: number): IntLiteralObj {
  return { tag: "LITERAL", type: { tag: "TYPE", type: { base: "INT" } }, val };
}

export type StrLiteralObj = { tag: "LITERAL"; type: StrTypeObj; val: string };
function makeStrLiteralObj(val: string): StrLiteralObj {
  return { tag: "LITERAL", type: { tag: "TYPE", type: { base: "STR" } }, val };
}

export type NilLiteralObj = { tag: "LITERAL"; type: NilTypeObj };
function makeNilLiteralObj(): NilLiteralObj {
  return { tag: "LITERAL", type: { tag: "TYPE", type: { base: "NIL" } } };
}

export type FuncLiteralObj = {
  tag: "LITERAL";
  type: FuncTypeObj<AnyTypeObj[], AnyTypeObj | null>;
  body: BlockObj;
};
function makeFuncLiteral(
  inputT: AnyTypeObj[],
  returnT: AnyTypeObj | null,
  body: BlockObj
): FuncLiteralObj {
  return { tag: "LITERAL", type: makeFunctionType(inputT, returnT), body };
}

export type AnyLiteralObj =
  | BoolLiteralObj
  | IntLiteralObj
  | StrLiteralObj
  | NilLiteralObj
  | FuncLiteralObj;

export type SelectorObj = {
  tag: "SELECTOR";
  obj: ExprObj;
  ident: IdentObj;
};
export type IndexObj = {
  tag: "INDEX";
  obj: ExprObj;
  index: ExprObj;
};
export type CallObj = {
  tag: "CALL";
  func: ExprObj;
  args: ExprObj[];
};

export type MakeCallObj = {
  tag: "MAKE";
  args: (AnyTypeObj | ExprObj)[];
};
export type NewCallObj = {
  tag: "New";
  type: AnyTypeObj;
  len: ExprObj | null;
};

function primaryExprReduceHelper(
  expr: ExprObj,
  op: any
): SelectorObj | IndexObj | CallObj {
  if (op.tag === "SELECTOR") {
    return { tag: "SELECTOR", obj: expr, ident: op.ident };
  } else if (op.tag === "INDEX") {
    return { tag: "INDEX", obj: expr, index: op.index };
  } else if (op.tag === "CALL") {
    return { tag: "CALL", func: expr, args: op.args };
  } else {
    throw "UNKNOWN PRIMARY EXPR TAG";
  }
}

export type UnaryExprObj = {
  tag: "UNARY_EXPR";
  op: string;
  expr: ExprObj;
};
export function makeUnaryExpr(expr: ExprObj, op: string) {
  return { tag: "UNARY_EXPR", expr, op };
}

export type BinaryExprObj = {
  tag: "BINARY_EXPR";
  op: string;
  lhs: ExprObj;
  rhs: ExprObj;
};
function makeBinaryExpr(lhs: ExprObj, op: string, rhs: ExprObj) {
  return { tag: "BINARY_EXPR", lhs, op, rhs };
}

export type ExprObj =
  | IdentObj
  | AnyLiteralObj
  | SelectorObj
  | IndexObj
  | CallObj
  | UnaryExprObj
  | BinaryExprObj
  | MakeCallObj
  | NewCallObj;

export type ExpressionStmtObj = {
  tag: "STMT";
  stmtType: "EXPR";
  expr: ExprObj;
  label?: IdentObj;
};
function makeExpressionStmt(expr: ExprObj): ExpressionStmtObj {
  return { tag: "STMT", stmtType: "EXPR", expr };
}

export type ChanStmtObj = {
  tag: "STMT";
  stmtType: "SEND";
  lhs: ExprObj;
  rhs: ExprObj;
  label?: IdentObj;
};
function makeChanStmt(lhs: ExprObj, rhs: ExprObj): ChanStmtObj {
  return { tag: "STMT", stmtType: "SEND", lhs, rhs };
}

export type IncStmtObj = {
  tag: "STMT";
  stmtType: "INC";
  expr: ExprObj;
  label?: IdentObj;
};
function makeIncStmt(expr: ExprObj): IncStmtObj {
  return { tag: "STMT", stmtType: "INC", expr };
}
export type DecStmtObj = {
  tag: "STMT";
  stmtType: "DEC";
  expr: ExprObj;
  label?: IdentObj;
};

export function makeDecStmt(expr: ExprObj): DecStmtObj {
  return { tag: "STMT", stmtType: "DEC", expr };
}

export type AssignmentStmtObj = {
  tag: "STMT";
  stmtType: "ASSIGN";
  lhs: ExprObj;
  rhs: ExprObj;
  op: "=" | ":=";
  label?: IdentObj;
};
export function makeAssignmentStmt(
  lhs: ExprObj,
  op: "=" | ":=",
  rhs: ExprObj
): AssignmentStmtObj {
  return { tag: "STMT", stmtType: "ASSIGN", lhs, rhs, op };
}

export type IfStmtObj = {
  tag: "STMT";
  stmtType: "IF";
  pre: ExprObj | null;
  cond: ExprObj;
  body: BlockObj;
  elseBody: BlockObj | IfStmtObj | null;
  label?: IdentObj;
};
function makeIfStmt(
  pre: ExprObj | null,
  cond: ExprObj,
  body: BlockObj,
  elseBody: BlockObj | IfStmtObj | null
): IfStmtObj {
  return { tag: "STMT", stmtType: "IF", pre, cond, body, elseBody };
}

export type SwitchStmtObj = {
  tag: "STMT";
  stmtType: "SWITCH";
  pre: ExprObj | null;
  cond: ExprObj;
  cases: CaseClauseObj[];
  label?: IdentObj;
};
function makeSwitchStmt(
  pre: ExprObj | null,
  cond: ExprObj | null,
  cases: CaseClauseObj[]
): SwitchStmtObj {
  return {
    tag: "STMT",
    stmtType: "SWITCH",
    pre,
    cond: cond ?? makeBoolLiteral(true),
    cases,
  };
}

export type CaseClauseObj = {
  tag: "CASE_CLAUSE";
  case: ExprObj | "DEFAULT";
  body: StmtObj[];
};
function makeCaseClause(
  caseExpr: ExprObj | "DEFAULT",
  body: StmtObj[]
): CaseClauseObj {
  return { tag: "CASE_CLAUSE", case: caseExpr, body };
}

export type ForStmtObj = {
  tag: "STMT";
  stmtType: "FOR";
  pre: StmtObj | null;
  cond: ExprObj | null;
  post: StmtObj | null;
  body: BlockObj;
  label?: IdentObj;
};
function makeForStmt(
  pre: StmtObj | null,
  cond: ExprObj | null,
  post: StmtObj | null,
  body: BlockObj
): ForStmtObj {
  return { tag: "STMT", stmtType: "FOR", pre, cond, post, body };
}

export type BreakStmtObj = {
  tag: "STMT";
  stmtType: "BREAK";
  breakLabel: IdentObj | null;
};
function makeBreakStmt(breakLabel: IdentObj | null): BreakStmtObj {
  return { tag: "STMT", stmtType: "BREAK", breakLabel };
}

export type ContStmtObj = {
  tag: "STMT";
  stmtType: "CONTINUE";
  contLabel: IdentObj | null;
};
function makeContStmt(contLabel: IdentObj | null): ContStmtObj {
  return { tag: "STMT", stmtType: "CONTINUE", contLabel };
}

export type GotoStmtObj = {
  tag: "STMT";
  stmtType: "GOTO";
  gotoLabel: IdentObj;
};
function makeGoToStmt(gotoLabel: IdentObj): GotoStmtObj {
  return { tag: "STMT", stmtType: "GOTO", gotoLabel };
}

export type FallthroughStmtObj = {
  tag: "STMT";
  stmtType: "FALLTHROUGH";
};
function makeFallthroughStmt(): FallthroughStmtObj {
  return { tag: "STMT", stmtType: "FALLTHROUGH" };
}

export type DeferStmtObj = {
  tag: "STMT";
  stmtType: "DEFER";
  stmt: StmtObj;
};
function makeDeferStmt(stmt: StmtObj): DeferStmtObj {
  return { tag: "STMT", stmtType: "DEFER", stmt };
}

export type GoStmtObj = {
  tag: "STMT";
  stmtType: "GO";
  expr: ExprObj;
};
function makeGoStmt(expr: ExprObj): GoStmtObj {
  return { tag: "STMT", stmtType: "GO", expr };
}

export type SelectStmtObj = {
  tag: "STMT";
  stmtType: "SELECT";
  cases: SelectCaseObj[];
};
function makeSelectStmt(cases: SelectCaseObj[]): SelectStmtObj {
  return { tag: "STMT", stmtType: "SELECT", cases };
}

export type SelectCaseObj = {
  tag: "SELECT_CASE";
  comm:
    | { recvCh: IdentObj }
    | { sendCh: IdentObj; val: ExprObj }
    | { recvCh: IdentObj; to: IdentObj; op: "=" | ":=" }
    | "DEFAULT";
  body: StmtObj[];
};
function makeSelectCase(
  comm:
    | { recvCh: IdentObj }
    | { sendCh: IdentObj; val: ExprObj }
    | { recvCh: IdentObj; to: IdentObj; op: "=" | ":=" }
    | "DEFAULT",
  body: StmtObj[]
): SelectCaseObj {
  return { tag: "SELECT_CASE", comm, body };
}

export type ReturnStmtObj = {
  tag: "STMT";
  stmtType: "RETURN";
  expr: ExprObj;
};
function makeReturnStmt(expr: ExprObj): ReturnStmtObj {
  return { tag: "STMT", stmtType: "RETURN", expr };
}

export type StmtObj =
  | ExpressionStmtObj
  | ChanStmtObj
  | IncStmtObj
  | DecStmtObj
  | AssignmentStmtObj
  | IfStmtObj
  | SwitchStmtObj
  | SelectStmtObj
  | ForStmtObj
  | BreakStmtObj
  | ContStmtObj
  | GotoStmtObj
  | FallthroughStmtObj
  | DeferStmtObj
  | GoStmtObj
  | ReturnStmtObj
  | VarDeclObj
  | ConstDeclObj
  | FuncDeclObj;

export type ProgramObj = (ContStmtObj | VarDeclObj | FuncDeclObj)[];
