export type TypeObj<T> = { tag: "TYPE", type: T };
export type BoolTypeObj = TypeObj<{ base: "BOOL" }>
export type IntTypeObj = TypeObj<{ base: "INT" }>
export type StrTypeObj = TypeObj<{ base: "STR" }>
export type NilTypeObj = TypeObj<{ base: "NIL" }>

export type PtrTypeObj<T> = TypeObj<{ base: "PTR"; inner: T }>
export type ArrayTypeObj<T> = TypeObj<{ base: "ARRAY"; inner: T; len: any }>
export type ChanTypeObj<T, M = "DUAL" | "IN" | "OUT"> = TypeObj<{ base: "CHAN"; inner: T; mode: M }>
export type FuncTypeObj<I, O> = TypeObj<{ base: "FUNC"; inputT: I; returnT: O }>

export type AnyTypeObj = NilTypeObj | BoolTypeObj | IntTypeObj | StrTypeObj | PtrTypeObj<any> | ArrayTypeObj<any> | ChanTypeObj<any> | FuncTypeObj<any, any>
export type UnknownTypeObj = TypeObj<{ base: "UNKNOWN" }>

export function makeStringType() : StrTypeObj {
    return { tag: "TYPE", type: { base:"STR" } };
}
export function makeBoolType() : BoolTypeObj {
    return { tag: "TYPE", type: { base:"BOOL" } };
}
export function makeIntType() : IntTypeObj {
    return { tag: "TYPE", type: { base:"INT" } };
}
export function makePtrType<T extends AnyTypeObj>(inner: T) : PtrTypeObj<T> {
    return { tag: "TYPE", type: { base:"PTR", inner } };
}
export function makeArrayType<T extends AnyTypeObj>(len: ExprObj, inner: T) : ArrayTypeObj<T> {
    return { tag: "TYPE", type: { base:"ARRAY", len, inner } };
}
export function makeChanType<T extends AnyTypeObj, M extends "DUAL" | "IN" | "OUT">(inner: T, mode: M) : ChanTypeObj<T, M> {
    return { tag: "TYPE", type: { base:"CHAN", inner, mode } };
}
export function makeFunctionType<I extends AnyTypeObj[], O extends AnyTypeObj[]>(inputT: I, returnT: O) : FuncTypeObj<I, O> {
    return { tag: "TYPE", type: { base:"FUNC", inputT, returnT } };
}

export type IdentObj = { tag: "IDENT", type: null | AnyTypeObj, val: string }
export function makeIdent(val: string) : IdentObj {
    return { tag:"IDENT", type: null, val };
}

export type BlockObj = { tag: "BLOCK", stmts: StmtObj[] }
export function makeBlock(stmts: StmtObj[]) : BlockObj {
    return { tag: "BLOCK", stmts };
}

export type ConstDeclObj = {
    tag: "CONST_DECL";
    ident: string;
    type: AnyTypeObj;
    val: ExprObj;
}
export function makeConstDecl(ident: string, type: AnyTypeObj, val: ExprObj) : ConstDeclObj {
    return { tag: "CONST_DECL", ident, type, val };
}

export type VarDeclObj = {
    tag: "VAR_DECL";
    ident: string;
    type: AnyTypeObj;
    val: ExprObj | null;
}
export function makeVarDecl(ident: string, type: AnyTypeObj, val: ExprObj | null) : VarDeclObj {
    return { tag: "VAR_DECL", ident, type, val };
}

export type FuncDeclObj = {
    tag: "FUNC_DECL";
    ident: string;
    inputT: AnyTypeObj[];
    returnT: AnyTypeObj[];
    body: BlockObj;
}
export function makeFuncDecl(ident: string, inputT: AnyTypeObj[], returnT: AnyTypeObj[], body: BlockObj) : FuncDeclObj {
    return { tag: "FUNC_DECL", ident, inputT, returnT, body };
}

export type BoolLiteralObj = { tag: "LITERAL", type: BoolTypeObj, val: boolean }
export function makeBoolLiteral(val: boolean) : BoolLiteralObj {
    return { tag: "LITERAL", type: { tag: "TYPE", type: { base:"BOOL" } }, val };
}

export type IntLiteralObj = { tag: "LITERAL", type: IntTypeObj, val: number }
export function makeIntLiteralObj(val: number) : IntLiteralObj {
    return { tag: "LITERAL", type: { tag: "TYPE", type: { base:"INT" } }, val };
}

export type StrLiteralObj = { tag: "LITERAL", type: StrTypeObj, val: string }
export function makeStrLiteralObj(val: string) : StrLiteralObj {
    return { tag: "LITERAL", type: { tag: "TYPE", type: { base:"STR" } }, val };
}

export type NilLiteralObj = { tag: "LITERAL", type: NilTypeObj  }
export function makeNilLiteralObj() : NilLiteralObj {
    return { tag: "LITERAL", type: { tag: "TYPE", type: { base:"NIL" } } };
}

export type AnyLiteralObj = BoolLiteralObj | IntLiteralObj | StrLiteralObj | NilLiteralObj

export type SelectorObj = {
    tag: "SELECTOR";
    obj: ExprObj;
    ident: string;
}
export type IndexObj = {
    tag: "INDEX";
    obj: ExprObj;
    index: ExprObj;
}
export type CallObj = {
    tag: "CALL";
    func: ExprObj;
    args: ExprObj[];
}

export function primaryExprReduceHelper(expr: ExprObj, op: any) : SelectorObj | IndexObj | CallObj {
    if (op.tag === "SELECTOR") {
        return { tag: "SELECTOR", obj: expr, ident: op.ident };
    } else if (op.tag === "INDEX") {
        return { tag: "INDEX", obj: expr, index: op.index };
    } else if (op.tag === "CALL") {
        return { tag: "CALL", func: expr, args: op.args };
    } else {
        throw "UNKNOWN PRIMARY EXPR TAG"
    }
}

export type UnaryExprObj = {
    tag: "UNARY_EXPR";
    op: string;
    expr: ExprObj;
}
export function makeUnaryExpr(expr: ExprObj, op: string) {
    return { tag: "UNARY_EXPR", expr, op };
}

export type BinaryExprObj = {
    tag: "BINARY_EXPR";
    op: string;
    lhs: ExprObj;
    rhs: ExprObj;
}
export function makeBinaryExpr(lhs: ExprObj, op: string, rhs: ExprObj) {
    return { tag: "BINARY_EXPR", lhs, op, rhs };
}

export type ExprObj = IdentObj | AnyLiteralObj | SelectorObj | IndexObj | CallObj | UnaryExprObj | BinaryExprObj

export type ExpressionStmtObj = {
    tag: "STMT";
    stmtType: "EXPR";
    expr: ExprObj;
    label?: string;
}
export function makeExpressionStmt(expr: ExprObj) : ExpressionStmtObj {
    return { tag: "STMT", stmtType: "EXPR", expr };
}

export type ChanStmtObj = {
    tag: "STMT";
    stmtType: "SEND";
    lhs: ExprObj;
    rhs: ExprObj;
    label?: string;
}
export function makeChanStmt(lhs: ExprObj, rhs: ExprObj) : ChanStmtObj {
    return { tag: "STMT", stmtType: "SEND", lhs, rhs };
}

export type IncStmtObj = {
    tag: "STMT";
    stmtType: "INC";
    expr: ExprObj;
    label?: string;
}
export function makeIncStmt(expr: ExprObj) : IncStmtObj {
    return { tag: "STMT", stmtType: "INC", expr };
}
export type DecStmtObj = { 
    tag: "STMT";
    stmtType: "DEC";
    expr: ExprObj;
    label?: string;
}
export function makeDecStmt(expr: ExprObj) : DecStmtObj {
    return { tag: "STMT", stmtType: "DEC", expr };
}

export type AssignmentStmtObj = {  
    tag: "STMT";
    stmtType: "ASSIGN";
    lhs: ExprObj;
    rhs: ExprObj;
    op: "=" | ":=";
    label?: string;
}
export function makeAssignmentStmt(lhs: ExprObj, op: "=" | ":=", rhs: ExprObj) : AssignmentStmtObj {
    return { tag: "STMT", stmtType: "ASSIGN", lhs, rhs, op };
}

export type IfStmtObj = {
    tag: "STMT";
    stmtType: "IF";
    pre?: ExprObj;
    cond: ExprObj;
    body: BlockObj;
    elseBody?: BlockObj | IfStmtObj;
    label?: string;
}
export function makeIfStmt(pre: ExprObj | undefined, cond: ExprObj, body: BlockObj, elseBody: BlockObj | IfStmtObj | undefined) : IfStmtObj {
    return { tag: "STMT", stmtType: "IF", pre, cond, body, elseBody };
}

export type SwitchStmtObj = {
    tag: "STMT";
    stmtType: "SWITCH";
    pre?: ExprObj;
    cond: ExprObj;
    cases: CaseClauseObj[];
    label?: string;
}
export function makeSwitchStmt(pre: ExprObj | undefined, cond: ExprObj, cases: CaseClauseObj[]) : SwitchStmtObj {
    return { tag: "STMT", stmtType: "SWITCH", pre, cond, cases };
}

export type CaseClauseObj = {
    tag: "CASE_CLAUSE";
    case: ExprObj | "DEFAULT";
    body: StmtObj[]
}
export function makeCaseClause(caseExpr: ExprObj | "DEFAULT", body: StmtObj[]) : CaseClauseObj {
    return { tag: "CASE_CLAUSE", case: caseExpr, body };
}

export type ForStmtObj = {
    tag: "STMT";
    stmtType: "FOR";
    pre?: StmtObj;
    cond?: ExprObj;
    post?: StmtObj;
    body: BlockObj;
    label?: string;
}
export function makeForStmt(pre: StmtObj | undefined, cond: ExprObj | undefined, post: StmtObj | undefined, body: BlockObj) : ForStmtObj {
    return { tag: "STMT", stmtType: "FOR", pre, cond, post, body };
}

export type BreakStmtObj = {
    tag: "STMT";
    stmtType: "BREAK";
    label?: string;
}
export function makeBreakStmt() : BreakStmtObj {
    return { tag: "STMT", stmtType: "BREAK" };
}

export type ContStmtObj = {
    tag: "STMT";
    stmtType: "CONTINUE";
    label?: string;
}
export function makeContStmt() : ContStmtObj {
    return { tag: "STMT", stmtType: "CONTINUE" };
}

export type GotoStmtObj = {
    tag: "STMT";
    stmtType: "GOTO";
    label: string;
}
export function makeGoToStmt(label: string) : GotoStmtObj {
    return { tag: "STMT", stmtType: "GOTO", label };
}

export type FallthroughStmtObj = {
    tag: "STMT";
    stmtType: "FALLTHROUGH";
}
export function makeFallthroughStmt() : FallthroughStmtObj {
    return { tag: "STMT", stmtType: "FALLTHROUGH" };
}

export type DeferStmtObj = {
    tag: "STMT";
    stmtType: "DEFER";
    stmt: CallObj;
}
export function makeDeferStmt(stmt: CallObj) : DeferStmtObj {
    return { tag: "STMT", stmtType: "DEFER", stmt };
}

export type GoStmtObj = {
    tag: "STMT";
    stmtType: "GO";
    stmt: CallObj;
}
export function makeGoStmt(stmt: CallObj) : GoStmtObj {
    return { tag: "STMT", stmtType: "GO", stmt };
}

export type StmtObj = ExpressionStmtObj | ChanStmtObj | IncStmtObj | DecStmtObj | AssignmentStmtObj | IfStmtObj | SwitchStmtObj | ForStmtObj | BreakStmtObj | ContStmtObj | GotoStmtObj | FallthroughStmtObj | DeferStmtObj | GoStmtObj