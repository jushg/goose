{{

function makeStringType() {
    return { tag: "TYPE", type: { base: "STR" } };
}
function makeBoolType() {
    return { tag: "TYPE", type: { base: "BOOL" } };
}
function makeIntType() {
    return { tag: "TYPE", type: { base: "INT" } };
}
function makePtrType(inner) {
    return { tag: "TYPE", type: { base: "PTR", inner } };
}
function makeArrayType(len, inner) {
    return { tag: "TYPE", type: { base: "ARRAY", len, inner } };
}
function makeChanType(inner, mode) {
    return { tag: "TYPE", type: { base: "CHAN", inner, mode } };
}
function makeChanDualType(inner) {
    return makeChanType(inner, "DUAL");
}
function makeChanInType(inner) {
    return makeChanType(inner, "IN");
}
function makeChanOutType(inner) {
    return makeChanType(inner, "OUT");
}
function makeFunctionType(inputT, returnT) {
    return { tag: "TYPE", type: { base: "FUNC", inputT, returnT } };
}
function makeIdent(val) {
    return { tag: "IDENT", val };
}
function makeBlock(stmts) {
    return { tag: "STMT", stmtType: "BLOCK", stmts };
}
function makeConstDecl(ident, type, val) {
    return { tag: "STMT", stmtType: "CONST_DECL", ident, type, val };
}
function makeVarDecl(ident, type, val) {
    return { tag: "STMT", stmtType: "VAR_DECL", ident, type, val };
}
function makeFuncDecl(ident, input, returnT, body) {
    return {
        tag: "STMT",
        stmtType: "FUNC_DECL",
        ident,
        lit: makeFuncLiteral(input, returnT, body),
    };
}
function makeBoolLiteral(val) {
    return { tag: "LITERAL", type: { tag: "TYPE", type: { base: "BOOL" } }, val };
}
function makeIntLiteralObj(val) {
    return { tag: "LITERAL", type: { tag: "TYPE", type: { base: "INT" } }, val };
}
function makeStrLiteralObj(val) {
    return { tag: "LITERAL", type: { tag: "TYPE", type: { base: "STR" } }, val };
}
function makeNilLiteralObj() {
    return { tag: "LITERAL", type: { tag: "TYPE", type: { base: "NIL" } } };
}
function makeFuncLiteral(input, returnT, body) {
    return {
        tag: "LITERAL",
        type: makeFunctionType(input.map(({ type }) => type), returnT),
        input,
        body,
    };
}
function primaryExprReduceHelper(expr, op) {
    if (op.tag === "SELECTOR") {
        return { tag: "SELECTOR", obj: expr, ident: op.ident };
    }
    else if (op.tag === "INDEX") {
        return { tag: "INDEX", obj: expr, index: op.index };
    }
    else if (op.tag === "CALL") {
        return { tag: "CALL", func: expr, args: op.args };
    }
    else {
        throw "UNKNOWN PRIMARY EXPR TAG";
    }
}
function makeUnaryExpr(expr, op) {
    return { tag: "UNARY_EXPR", expr, op };
}
function makeBinaryExpr(lhs, op, rhs) {
    return { tag: "BINARY_EXPR", lhs, op, rhs };
}
function makeNoOp(label) {
    return { tag: "NO_OP", label };
}
function makeExpressionStmt(expr) {
    return { tag: "STMT", stmtType: "EXPR", expr };
}
function makeChanStmt(lhs, rhs) {
    return { tag: "STMT", stmtType: "SEND", lhs, rhs };
}
function makeIncStmt(expr) {
    return { tag: "STMT", stmtType: "INC", expr };
}
function makeDecStmt(expr) {
    return { tag: "STMT", stmtType: "DEC", expr };
}
function makeAssignmentStmt(lhs, op, rhs) {
    return { tag: "STMT", stmtType: "ASSIGN", lhs, rhs, op };
}
function makeIfStmt(pre, cond, body, elseBody) {
    return { tag: "STMT", stmtType: "IF", pre, cond, body, elseBody };
}
function makeSwitchStmt(pre, cond, cases) {
    return {
        tag: "STMT",
        stmtType: "SWITCH",
        pre,
        cond: cond ?? makeBoolLiteral(true),
        cases,
    };
}
function makeCaseClause(caseExpr, body) {
    return { tag: "CASE_CLAUSE", case: caseExpr, body };
}
function makeForStmt(pre, cond, post, body) {
    return { tag: "STMT", stmtType: "FOR", pre, cond, post, body };
}
function makeBreakStmt(breakLabel) {
    return { tag: "STMT", stmtType: "BREAK", breakLabel };
}
function makeContStmt(contLabel) {
    return { tag: "STMT", stmtType: "CONTINUE", contLabel };
}
function makeGoToStmt(gotoLabel) {
    return { tag: "STMT", stmtType: "GOTO", gotoLabel };
}
function makeFallthroughStmt() {
    return { tag: "STMT", stmtType: "FALLTHROUGH" };
}
function makeDeferStmt(stmt) {
    return { tag: "STMT", stmtType: "DEFER", stmt };
}
function makeGoStmt(expr) {
    return { tag: "STMT", stmtType: "GO", expr };
}
function makeSelectStmt(cases) {
    return { tag: "STMT", stmtType: "SELECT", cases };
}
function makeSelectCase(comm, body) {
    return { tag: "SELECT_CASE", comm, body };
}
function makeReturnStmt(expr) {
    return { tag: "STMT", stmtType: "RETURN", expr };
}
function makeSysCall(sym, type, args) {
    return { tag: "SYS_CALL", sym, type, args };
}


}}


// ##############################################################################################################
// # This file is a rewrite of the PIGEON spec as PEG spec, with heavy modifications. Original pigeon spec:
// # https://github.com/hachi8833/golang_spec_peg_pigen/blob/fc1556685adb4f494e1fe9371c3a32353a7ba797/golang.peg
// ##############################################################################################################

// # Source file organization ==============
TOPLEVEL                                 = BD a:( Declaration BD )* EOF
	{ return a.map(aa => aa[0]); }

// # Characters =============================

NEWLINE        "newline"                 = '\n' (WS/'\n')* / [\n]*
LETTER         "letter"                  = [a-z]i
DIGIT          "digit"                   = [0-9]

// # primitive signs -----------------------

BD                                              = WS* (SEMICOLON / NEWLINE) WS*

SEMICOLON         "semicolon"                   = ';'
COLON             "colon"                       = ':'
DOT               "dot"                         = '.'

LPAREN            "left parenthesis"            = '('
LBRACK            "left bracket"                = '['
LBRACE            "left brace"                  = '{'
COMMA             "comma"                       = ','
PERIOD            "period"                      = '.'

RPAREN            "right parenthesis"           = ')'
RBRACK            "right bracket"               = ']'
RBRACE            "right brace"                 = '}'

PLUS              "plus"                        = '+'
MINUS             "minus"                       = '-'

SLASH             "slash"                       = '/'
BSLASH            "backslash"                   = [U+005C]        // \

EQUAL             "equal"                       = '='
LSS               "less than"                   = '<'
GTR               "greater than"                = '>'

AMPER             "ampersand"                   = '&'
BANG              "bang"                        = '!'
HAT               "hat"                         = '^'
PERCENT           "percent"                     = '%'
BAR               "bar"                         = '|'
UBAR              "underbar"                    = '_'
ASTERISK          "asterisk"                    = '*'

DQUO              "double quote"                = [U+0022]        // ""
SQUO              "single quote"                = [U+0027]        // ''
BQUO              "back quote/grave accent"     = [U+0060]        // ``

// # operators/delimiters ------------------

NOT               "not"                         = BANG            // '!'

NEG               "neg"                         = HAT             // '^'
SHL               "shift left"                  = LSS LSS         // '<<'
  { return '<<' }
SHR               "shift right"                 = GTR GTR         // '>>'
  { return '>>' }
OR                "or"                          = BAR             // '|'
XOR               "xor"                         = HAT             // '^'
AND               "and"                         = AMPER           // '&'
AND_NOT           "and not"                     = AMPER HAT       // '&^'
  { return '&^' }

ADD               "add"                         = PLUS            // '+'
SUB               "subtract"                    = MINUS           // '-'
MUL               "multiply"                    = ASTERISK        // '*'
QUO               "quotient"                    = SLASH           // '/'
REM               "remainder"                   = PERCENT         // '%'

LAND              "logical AND"                 = AMPER AMPER     // '&&'
  { return '&&' }
LOR               "logical OR"                  = BAR BAR         // '||'
  { return '||' }
ARROW             "arrow"                       = LSS MINUS       // '<-'
  { return '<-' }
INC               "increment"                   = PLUS PLUS       // '++'
  { return '++' }
DEC               "decrement"                   = MINUS MINUS     // '--'
  { return '--' }

EQL               "equal"                       = EQUAL EQUAL     // '=='
  { return '==' }
NEQ               "not equal"                   = BANG EQUAL      // '!='
  { return '!=' }
LEQ               "less or equal"               = LSS EQUAL       // '<='
  { return '<=' }
GEQ               "greater or equal"            = GTR EQUAL       // '>='
  { return '>=' }
DEFINE            "define"                      = COLON EQUAL     // ':='
  { return ':=' }
ELLIPSIS          "ellipsis"                    = DOT DOT DOT     // '...'
  { return '...' }

ASSIGN            "assign"                      = EQUAL           // '='
ADD_ASSIGN        "assign: add"                 = PLUS EQUAL      // '+='
  { return '+=' }
SUB_ASSIGN        "assign: subtract"            = MINUS EQUAL     // '-='
  { return '-=' }
MUL_ASSIGN        "assign: multiply"            = ASTERISK EQUAL  // '*='
  { return '*=' }
QUO_ASSIGN        "assign: quotient"            = SLASH EQUAL     // '/='
  { return '/=' }
REM_ASSIGN        "assign: remainder"           = PERCENT EQUAL   // '%='
  { return '%=' }

AND_ASSIGN        "assign: logical AND"         = AMPER EQUAL     // '&='
  { return '&=' }
OR_ASSIGN         "assign: logical OR"          = BAR EQUAL       // '|='
  { return '|=' }
XOR_ASSIGN        "assign: logical XOR"         = HAT EQUAL       // '^='
  { return '^=' }
AND_NOT_ASSIGN    "assign: logical AND NOT"     = AMPER HAT EQUAL // '&^='
  { return '&^=' }

SHL_ASSIGN        "assign: shift left"          = LSS LSS EQUAL   // '<<='
  { return '<<=' }
SHR_ASSIGN        "assign: shift right"         = GTR GTR EQUAL   // '>>='
  { return '>>=' }

ADDR              "address"                     = AMPER           // '&'
REFR              "resolve reference"           = ASTERISK        // '*'

WS                "white space"               = [ \t]+

COMMENT_LINE      "end-of-line comment"         = "//" content:( ![\r\n] . )* [\r\n] 
  { return { tag: 'COMMENT_LINE', content: content.map(x => x[1]).join('').trim() } }

COMMENT_MULTI     "multiline-comment"           = "/*" content:( !"*/" . )* "*/" 
  { return { tag: 'COMMENT_MULTI', content: content.map(x => x[1]).join('').trim() } }


// # Identifiers ============================

RESERVED = (
  ("func" / "new" / "make" / "case" / "select" / "switch" / "if" / "else" / "for" / "go" / "var" / "const" / "int" / "string" / "chan" / "__sys" / "__noop")
  !( LETTER / DIGIT / UBAR ) // Excludes possible identifiers that start with a reserved keyword (e.g. `forCounter`)
)

IDENT          "identifier"              = !RESERVED x:LETTER y:( LETTER / DIGIT / UBAR )*
  { return makeIdent(x + y.join('')); }

// # Types ==================================

Type            "type"                          = CompoundType
                                                / LPAREN Type RPAREN
                                                / TypeName

TypeName        "type name"                     = val:( 'string' / 'int' / 'bool')
 { return val == 'string' ? makeStringType() : val == 'int' ? makeIntType() : makeBoolType()}

CompoundType     "type literal"                  = ArrayType
                                                / ChannelType
                                                / FunctionType
                                                / PointerType

PointerType 	"pointer type" 					= ASTERISK inner:Type
	{ return makePtrType(inner); }

ArrayType       "array type"                    = LBRACK len:Expression RBRACK elementType:Type
	{ return makeArrayType(len, elementType);}

ChannelType     "channel type"                  = ChannelOutType / ChannelInType / ChannelDualType

ChannelDualType     "chan-dual type"                  = "chan" WS inner:Type
    { return makeChanDualType(inner) }  

ChannelOutType     "chan-out type"                  = ARROW WS? "chan" WS inner:Type
    { return makeChanOutType(inner) }  

ChannelInType     "chan-in type"                  = "chan" WS? ARROW WS? inner:Type
	{ return makeChanInType(inner) }  

FunctionType      "function type"                 = "func" WS? inputT:FnParamListType WS? returnT:(Type?) WS?
  { return makeFunctionType(inputT, returnT) }

FnParamListType       "function parameter type"   = LPAREN WS? IDENT? WS? a:Type b:(WS? ',' WS? IDENT? WS? Type)* WS? RPAREN
  { return [a, ...(b.map(bb => bb[5]))] }
                                                  / LPAREN WS? RPAREN
  { return []; }

// # Blocks =================================

Block           "block"                         = LBRACE BD? stmts:StatementList BD? RBRACE
  { return makeBlock(stmts); }

StatementList   "statement list"                = v:( Statement BD )*
  { return v.map(vv => vv[0]) }

// # Declarations and scope =================

Declaration     "declaration"                   = ConstDecl
                                                / VarDecl
                                                / FunctionDecl
                                                
// # Constant declarations ==================

ConstDecl       "constant declaration"          = "const" WS ident:IDENT WS? identType:(Type?) WS? EQUAL WS? expr:Expression
  { return makeConstDecl(ident, identType, expr) }

VarDecl         "variable declaration"          = "var" WS ident:IDENT WS identType:Type expr:(WS? EQUAL WS? expr:Expression)?
  { return makeVarDecl(ident, identType, (expr ?? [null, null])[1]); }

// # Function declarations ==================

FnParamSubList        "function parameters"   = a:IDENT bs:(WS? ',' WS? IDENT)* WS type:Type
  { return [ { ident: a, type }, ...(bs.map(bb => { return { ident: bb[3], type } }))] }

FnParamList           "function parameters"   = LPAREN WS? a:FnParamSubList WS? b:(',' WS? FnParamSubList WS? )* WS? RPAREN
  { return [a, ...(b.map(bb => bb[2]))].flat() }
                                                  / WS? LPAREN WS? RPAREN
  { return []; }

FunctionDecl    "function declaration"          = "func" WS ident:IDENT WS? inputParam:FnParamList WS? returnT:(Type?) WS? body:Block
  { return makeFuncDecl(ident, inputParam, returnT, body) }

// # Expressions ============================

Operand         "operand"                       = '__noop' LPAREN str:(LETTER / DIGIT / UBAR)* RPAREN 
  { return makeNoOp(str.join('')) }
                                                / v: Literal { return v; }
                                                / v: IDENT { return v; }
                                                / LPAREN v:Expression RPAREN { return v; }
                                                

Literal         "literal"                       = IntegerLit
                                                / StringLit
                                                / FunctionLit
                                                / BoolLit

NilLit          "nil literal"                  = "nil"
  { return makeNilLiteralObj() }

BoolLit        "bool literal"            =v:("true" / "false")
  { return makeBoolLiteral(v === "true") }

IntegerLit     "integer literal"         = a:("0" /  [1-9] ) b:( ( UBAR )? DIGIT )*
  { return makeIntLiteralObj(Number(a + b.filter(bb => bb !== "_").map(i => i[1]).join(''))) }

StringLit      "string literal"          = '\"' content:([a-z]i / [0-9] / [ \t] / [.,?!_])* '\"'
  { return makeStrLiteralObj(content.join('')) }

FunctionLit     "function literal"              = "func" WS? input:FnParamList WS? returnT:(Type?) WS? body:Block
  { return makeFuncLiteral(input, returnT, body ) }
  
//////////////////////////STOOPPPEDD HERE STOPPED HERE BOING

// # Primary expressions ===================
PrimaryExpr     "primary expression"            = sym:("make"/"new") LPAREN WS? typeArg:Type WS? rest:(COMMA WS? Expression WS?)* RPAREN
    // Note that arg1 must be a type with `make` and `new`. This also means make, new are reserved and cannot be used as identifiers.
  {
    return makeSysCall(sym, typeArg, rest.map(r => r[2]));
  }
                                                / "__sys" LPAREN WS? sym:IDENT WS? COMMA WS? typeArg:(Type/"void") RPAREN
    // Note that arg1 must be a type with `make` and `new`. This also means make, new are reserved and cannot be used as identifiers.
  {
    typeArg = typeArg === "void" ? null : typeArg;
    return makeSysCall(sym, typeArg, []);
  }
                                                / a:Operand WS? b:((WS? (Selector / Index / Arguments))*)
  {
    // Note the '*' makes a standalone Operand a valid PrimaryExpr.
    return b.map(bb => bb[1]).reduce(primaryExprReduceHelper, a);
  }

Selector        "selector in expression"        = DOT ident:IDENT
  { return { tag: "SELECTOR", ident } }

Index           "index in expression"           = LBRACK index:Expression RBRACK
  { return { tag: "INDEX", index } }

Arguments       "arguments"                     = LPAREN WS? RPAREN
  { return { tag: "CALL", args: [] } }
                                                / LPAREN WS? arg1:Expression WS? rest:(COMMA WS? Expression WS?)* RPAREN
  {
    const args = [arg1, ...(rest.map(r => r[2]))]
    return { tag: "CALL", args }
  }

// # Operators ============================

// Of highest precedence is the unary operators, which are right-associative and pre-fix.
// After that comes the binary operators:

// Precedence    Operator
//     5             *  /  %  <<  >>  &  &^
//     4             +  -  |  ^
//     3             ==  !=  <  <=  >  >=
//     2             &&
//     1             ||

// To avoid left-recursive grammars, we use the following approach:
// Expressions are defined as L1 expressions.
// L1 expressions are standalone L2 or 2 L2 expressions with an L1 binary operator.
// L2 expressions are standalone L3 or 2 L3 expressions with an L2 binary operator.
// ... and so on. The last level is unary because unary has the highest precedence of all.

Expression      "expression"             = BinaryExprL1

UnaryExpr       "unary expression"              = b:(unary_op  WS?)* a:PrimaryExpr
  {
    // Note the '*' makes a standalone PrimaryExpr (which itself could be a standalone Operand)
    // a valid UnaryExpr.
    // Note as per golang spec ++ and -- are outside operator hierarchy as they
    // form statements (E.g. p++ +p counts as two statements 'p++' and '+p').
    // All unary operators are right-associative, and pre-fix.
    b = b.map(bb => bb[0]).reverse();
    return b.reduce(makeUnaryExpr, a);
  }

// We use this to avoid left-recursion failure in the binary operators, and to enforce operator precedence.
BinaryExprL5    "binary expression level 5"     = a:UnaryExpr WS? b:(mul_op WS? UnaryExpr WS?)*
  {
    // Note the '*' makes a standalone UnaryExpr a valid BinaryExprL5.
    return b.reduce((acc, curr) => makeBinaryExpr(acc, curr[0], curr[2]), a);
  }
  
BinaryExprL4    "binary expression level 4"     = a:BinaryExprL5 WS? b:(add_op WS? BinaryExprL5 WS?)*
  {
    return b.reduce((acc, curr) => makeBinaryExpr(acc, curr[0], curr[2]), a);
  }

BinaryExprL3    "binary expression level 3"     = a:BinaryExprL4 WS? b:(rel_op WS? BinaryExprL4 WS?)*
  {
    return b.reduce((acc, curr) => makeBinaryExpr(acc, curr[0], curr[2]), a);
  }

BinaryExprL2    "binary expression level 2"     = a:BinaryExprL3 WS? b:(LAND WS? BinaryExprL3 WS?)*
  {
    return b.reduce((acc, curr) => makeBinaryExpr(acc, curr[0], curr[2]), a);
  }

BinaryExprL1    "binary expression level 1"     = a:BinaryExprL2 WS? b:(LOR WS? BinaryExprL2)*
  {
    return b.reduce((acc, curr) => makeBinaryExpr(acc, curr[0], curr[2]), a);
  }
  
unary_op        "unary operator"                = PLUS          // "+"
  { return '+' }
                                                / MINUS         // "-"
  { return '-' }
                                                / NOT           // "!"
  { return '!' }
                                                / NEG           // "^"
  { return '^' }
                                                / ADDR          // "*"
  { return '&' }
                                                / REFR          // "&"
  { return '*' }                                               
                                                / ARROW         // "<-"
  { return '<-' }

/*
binary_op       "binary operator"               = mul_op
                                                / add_op
                                                / rel_op
                                                / LAND          // "&&"
                                                / LOR           // "||"
*/

rel_op          "comparison operator"           = EQL           // "=="
                                                / NEQ           // "!="
                                                / LEQ           // "<="
                                                / LSS           // "<"
                                                / GEQ           // ">="
                                                / GTR           // ">"

add_op          "addition operator"             = ADD           // "+"
                                                / SUB           // "-"
                                                / OR            // "|"
                                                / XOR           // "^"

mul_op          "multiplication operator"       = MUL           // "*"
                                                / QUO           // "/"
                                                / REM           // "%"
                                                / SHL           // "<<"
                                                / SHR           // ">>"
                                                / AND           // "&"
                                                / AND_NOT       // "&^"

// # Statements ===========================

Statement       "statement"                     = LabeledStmt
                                                / UnlabeledStatement

SimpleStatement "simple statement"              = Declaration
                                                / IncDecStmt
                                                / Assignment
                                                / ExpressionStmt

UnlabeledStatement "unlabeled statement" 		= Declaration
                                                / GoStmt
                                                / ReturnStmt
                                                / BreakStmt
                                                / ContinueStmt
                                                / GotoStmt
                                                / FallthroughStmt
                                                / Block
                                                / IfStmt
                                                / SwitchStmt
                                                / SelectStmt
                                                / ForStmt
                                                / DeferStmt
                                                / GoStmt
                                                / ChanStmt
                                                / IncDecStmt
                                                / Assignment
                                                / ExpressionStmt

// # Labeled statements ===================

LabeledStmt     "labeled statement"             = label:IDENT WS? COLON WS? stmt:UnlabeledStatement
  { stmt.label = label; return stmt; }

// # Expression statements ================

ExpressionStmt  "expression statement"          = expr:Expression
  { return makeExpressionStmt(expr) }

// # Send statements ======================

ChanStmt        "chan-statement"                = lhs:Expression? WS? ARROW WS? rhs:Expression
  { return makeChanStmt(lhs, rhs) }

// # IncDec statements ====================

IncDecStmt      "increment/decrement statement" = expr:Expression WS? INC
  { return makeIncStmt(expr) }
                                                / expr:Expression WS? DEC
  { return makeDecStmt(expr) }

// # Assignments ==========================

Assignment      "assignment"                    = lhs:IDENT WS? c:COLON? EQUAL WS? rhs:Expression
  { return makeAssignmentStmt(lhs, c ? ":=" : "=", rhs) }

// # 'if' statements ======================

IfStmt  "'if' statement"  = "if" WS? pre:PreClause? WS? cond:Expression WS? block:Block WS? elseB:ElseClause?
  { return makeIfStmt(pre, cond, block, elseB) }

PreClause  "pre-clause"  = a:SimpleStatement WS? SEMICOLON { return a }
ElseClause  "else clause"  = "else" WS? block:( IfStmt / Block ) { return block }
// TODO

// # 'switch' statements ==================

SwitchStmt      "expression of 'switch' statement"  = "switch" WS pre:PreClause? WS? expr:Expression? WS? LBRACE WS? BD cases:(CaseClause BD)* WS? RBRACE
 { return makeSwitchStmt(pre, expr, cases.map(cc => cc[0])) }
CaseClause      "expression of 'case' clause"       = a:ExprSwitchCase WS? COLON WS? LBRACE BD? b:(UnlabeledStatement BD?)* RBRACE
  { return makeCaseClause(a, b.map(bb => bb[0])) }
  													/ a:ExprSwitchCase WS? COLON WS? b:(UnlabeledStatement)
  { return makeCaseClause(a, [b]) }
ExprSwitchCase  "expression of switch's 'case'"     = "case" WS a:Expression { return a; }
                                                    / "default"           { return "DEFAULT"; }

// # 'for' statements ======================

ForStmt         "'for' statement"               = "for" WS? clause:ForClause WS? body:Block
  { return makeForStmt(clause.pre, clause.cond, clause.post, body) }
                                                / "for" WS? body:Block
  { return makeForStmt(null, null, null, body)}

ForClause       "'for' clause"                  = pre:SimpleStatement? BD cond:Expression? BD post:SimpleStatement?
  { return { tag: "FOR_CLAUSE", pre, cond, post } }
                                                / cond:Expression?
  { return { tag: "FOR_CLAUSE", pre: null, cond, post: null } }

// # 'go' statements =======================

GoStmt          "'go' statement"                = "go" WS? expr:Expression  
  { return makeGoStmt(expr) }

// # 'select' statements ===================
SelectStmt      "'select' statement"            = "select" WS? LBRACE BD? WS? cases:(CommClause BD)* BD? WS? RBRACE
  { return makeSelectStmt(cases.map(cc => cc[0])) }
CommClause      "communication-clause"          = caseCl:CommCase WS? COLON WS? LBRACE BD? b:(UnlabeledStatement BD?)* RBRACE
  { return makeSelectCase(caseCl, b.map(bb => bb[0])) }
  												/ caseCl:CommCase WS? COLON WS? b:UnlabeledStatement
  { return makeSelectCase(caseCl, [b]) }
CommCase        "communication 'case'"          = "case" WS "<-" WS? a:IDENT   
  { return { recvCh: a }; }
  												/ "case" WS a:IDENT WS? "<-" WS? b:Expression   
  { return { sendCh: a, val: b }; }
  												/ "case" WS a:IDENT WS? op:('=' / ':=') WS? "<-" WS? b:IDENT   
  { return { recvCh: b, to: a, op }; }
                                                / "default"                                   
  { return "DEFAULT"; }

// # 'return' statements ===================

ReturnStmt      "'return' statement"            = "return" WS? expr:Expression?
  { return makeReturnStmt(expr) }

// # 'break' statements ====================

BreakStmt       "'break' statement"             = "break" WS? label:IDENT?
  { return makeBreakStmt(label) }

// # 'continue' statements =================

ContinueStmt    "'continue' statement"          = "continue" WS? label:IDENT?
  { return makeContStmt(label) }

// # 'goto' statements =====================

GotoStmt        "'goto' statement"              = "goto" WS? label:IDENT
  { return makeGoToStmt(label) }

// # 'fallthrough' statements ==============

FallthroughStmt "'fallthrough' statement"       = "fallthrough"
  { return makeFallthroughStmt() }

// # 'defer' statements ====================

DeferStmt       "'defer' statement"             = "defer" WS? expr:Expression
  { return makeDeferStmt(expr) }

EOF             "end-of-file"                   = !.
