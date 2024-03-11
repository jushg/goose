// ##############################################################################################################
// # This file is a rewrite of the PIGEON spec as PEG spec, with heavy modifications. Original pigeon spec:
// # https://github.com/hachi8833/golang_spec_peg_pigen/blob/fc1556685adb4f494e1fe9371c3a32353a7ba797/golang.peg
// ##############################################################################################################

// # Source file organization ==============

TOPLEVEL     "source file"             = a:( TopLevelDecl BD )* EOF
	{ return a.map(aa => aa[0]); }

// # Characters =============================

NEWLINE        "newline"                 = [\n]* / [\r\n]*
LETTER         "letter"                  = [a-z]i
DIGIT          "digit"                   = [0-9]

// # primitive signs -----------------------

BD              "statement delimiter"          = WS? (SEMICOLON / NEWLINE) WS?

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

IDENT          "identifier"              = x:LETTER y:( LETTER / DIGIT / UBAR )*
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

FunctionType      "function type"                 = "func" WS? inputT:FnParamListType WS? returnT:(Type?)
  { return makeFunctionType(inputT, returnT) }

FnParamListType       "function parameter type"   = LPAREN WS? a:Type b:(WS? ',' WS? Type)* WS? RPAREN
  { return [a, ...(b.map(bb => bb[3]))] }
                                                  / WS? LPAREN WS? RPAREN
  { return []; }

// # Blocks =================================

Block           "block"                         = LBRACE BD? stmts:StatementList BD? RBRACE
  { return makeBlock(stmts); }

StatementList   "statement list"                = v:( Statement BD )*
  { return v.map(vv => vv[0]) }

// # Declarations and scope =================

Declaration     "declaration"                   = ConstDecl
                                                / VarDecl

TopLevelDecl    "top-level declaration"         = Declaration
                                                / FunctionDecl

// # Constant declarations ==================

ConstDecl       "constant declaration"          = "const" WS ident:IDENT identType:(Type?) EQUAL expr:Expression
  { return makeConstDecl(ident, identType, expr) }

VarDecl         "variable declaration"          = "var" WS ident:IDENT identType:Type expr:(EQUAL expr:Expression)?
  { return makeVarDecl(ident, identType, (expr ?? [null, null])[1]); }

// # Function declarations ==================

FunctionDecl    "function declaration"          = "func" WS ident:IDENT WS? inputT:FnParamListType WS? returnT:(Type?) body:Block
  { return makeFuncDecl(ident, inputT, returnT ?? [], body) }

// # Expressions ============================

Operand         "operand"                       = v: Literal { return v; }
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
  { return makeIntLiteralObj(Number(a + b.filter(bb !== "_").map(i => i[1]).join(''))) }

StringLit      "string literal"          = '\"' content:([a-z]i / [0-9] / [ \t] / [.,?!_])* '\"'
  { return makeStrLiteralObj(content.join('')) }

FunctionLit     "function literal"              = "func" inputT:FnParamListType WS? returnT:(Type?) body:Block
  { return makeFuncLiteral(inputT, returnT: returnT ?? [], body ) }
  
//////////////////////////STOOPPPEDD HERE STOPPED HERE BOING

// # Primary expressions ===================

PrimaryExpr     "primary expression"            = a:Operand b:((Selector / Index / Arguments)*)
  {
    // Note the '*' makes a standalone Operand a valid PrimaryExpr.
    return b.reduce(primaryExprReduceHelper, a);
  }

Selector        "selector in expression"        = DOT ident:IDENT
  { return { tag: "SELECTOR", ident } }

Index           "index in expression"           = LBRACK index:Expression RBRACK
  { return { tag: "INDEX", index } }

Arguments       "arguments"                     = LPAREN WS? RPAREN
  { return { tag: "CALL", args: [] } }
                                                / LPAREN WS? arg1:(Expression/Type) WS? rest:(COMMA WS? Expression WS?)* RPAREN
  {
    // Note that arg1 is allowed to be a type (e.g. with `make` and `new`).
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

Statement       "statement"                     = Declaration
                                                / LabeledStmt
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

SimpleStatement "simple statement"              = Declaration
                                                / IncDecStmt
                                                / Assignment
                                                / ExpressionStmt

// # Labeled statements ===================

LabeledStmt     "labeled statement"             = label:IDENT WS? COLON WS? Statement
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
  { return makeAssignmentStmt(lhs, op: c ? ":=" : "=", rhs) }

// # 'if' statements ======================

IfStmt  "'if' statement"  = "if" WS? pre:PreClause? WS? cond:Expression WS? block:Block WS? elseB:ElseClause?
  { return makeIfStmt(pre, cond, block, elseB) }

PreClause  "pre-clause"  = a:SimpleStatement WS? SEMICOLON { return a }
ElseClause  "else clause"  = "else" WS? block:( IfStmt / Block ) { return block }
// TODO

// # 'switch' statements ==================

SwitchStmt      "expression of 'switch' statement"  = "switch" WS? pre:PreClause? WS? expr:(Expression)? WS? LBRACE WS? cases:CaseClause* WS? RBRACE
 { return makeSwitchStmt(pre, expr, cases) }
CaseClause      "expression of 'case' clause"       = a:ExprSwitchCase WS? COLON WS? b:StatementList
  { return makeCaseClause(a, b) }
ExprSwitchCase  "expression of switch's 'case'"     = "case" a:Expression { return a; }
                                                    / "default"           { return "DEFAULT"; }

// # 'for' statements ======================

ForStmt         "'for' statement"               = "for" WS? clause:ForClause WS? block:Block
  { return makeForStmt(clause.pre, clause.cond, clause.post, body) }
                                                / "for" WS? block:Block
  { return makeForStmt(null, null, null, block)}

ForClause       "'for' clause"                  = pre:SimpleStatement? BD cond:Expression? BD post:SimpleStatement?
  { return { tag: "FOR_CLAUSE", pre, cond, post } }
                                                / cond:Expression?
  { return { tag: "FOR_CLAUSE", pre: null, cond, post: null } }

// # 'go' statements =======================

GoStmt          "'go' statement"                = "go" WS? expr:Expression  
  { return makeGoStmt(expr) }

// # 'select' statements ===================

SelectStmt      "'select' statement"            = "select" WS? LBRACE WS? cases:CommClause* WS? RBRACE
  { return makeSelectStmt(cases) }
CommClause      "communication-clause"          = caseCl:CommCase WS? COLON WS? stmts:StatementList
  { return makeSelectCase(caseCl, stmts) }
CommCase        "communication 'case'"          = "case" WS? caseCl:( ChanStmt / UnaryExpr / Assignment )   
  { return caseCl; }
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