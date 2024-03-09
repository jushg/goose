// ##############################################################################################################
// # This file is a rewrite of the PIGEON spec as PEG spec, with heavy modifications. Original pigeon spec:
// # https://github.com/hachi8833/golang_spec_peg_pigen/blob/fc1556685adb4f494e1fe9371c3a32353a7ba797/golang.peg
// ##############################################################################################################

// # Source file organization ==============

// TOPLEVEL     "source file"             = PackageClause BD ( ImportDecl BD )* ( TopLevelDecl BD )* EOF
TOPLEVEL = Statement

// # Characters =============================

NEWLINE        "newline"                 = [\n] / [\r\n]
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
SHR               "shift right"                 = GTR GTR         // '>>'
OR                "or"                          = BAR             // '|'
XOR               "xor"                         = HAT             // '^'
AND               "and"                         = AMPER           // '&'
AND_NOT           "and not"                     = AMPER HAT       // '&^'

ADD               "add"                         = PLUS            // '+'
SUB               "subtract"                    = MINUS           // '-'
MUL               "multiply"                    = ASTERISK        // '*'
QUO               "quotient"                    = SLASH           // '/'
REM               "remainder"                   = PERCENT         // '%'

LAND              "logical AND"                 = AMPER AMPER     // '&&'
LOR               "logical OR"                  = BAR BAR         // '||'
ARROW             "arrow"                       = LSS MINUS       // '<-'
INC               "increment"                   = PLUS PLUS       // '++'
DEC               "decrement"                   = MINUS MINUS     // '--'

EQL               "equal"                       = EQUAL EQUAL     // '=='
NEQ               "not equal"                   = BANG EQUAL      // '!='
LEQ               "less or equal"               = LSS EQUAL       // '<='
GEQ               "greater or equal"            = GTR EQUAL       // '>='
DEFINE            "define"                      = COLON EQUAL     // ':='
ELLIPSIS          "ellipsis"                    = DOT DOT DOT     // '...'

ASSIGN            "assign"                      = EQUAL           // '='
ADD_ASSIGN        "assign: add"                 = PLUS EQUAL      // '+='
SUB_ASSIGN        "assign: subtract"            = MINUS EQUAL     // '-='
MUL_ASSIGN        "assign: multiply"            = ASTERISK EQUAL  // '*='
QUO_ASSIGN        "assign: quotient"            = SLASH EQUAL     // '/='
REM_ASSIGN        "assign: remainder"           = PERCENT EQUAL   // '%='

AND_ASSIGN        "assign: logical AND"         = AMPER EQUAL     // '&='
OR_ASSIGN         "assign: logical OR"          = BAR EQUAL       // '|='
XOR_ASSIGN        "assign: logical XOR"         = HAT EQUAL       // '^='
AND_NOT_ASSIGN    "assign: logical AND NOT"     = AMPER HAT EQUAL // '&^='

SHL_ASSIGN        "assign: shift left"          = LSS LSS EQUAL   // '<<='
SHR_ASSIGN        "assign: shift right"         = GTR GTR EQUAL   // '>>='

ADDR              "address"                     = AMPER           // '&'
REFR              "resolve reference"           = ASTERISK        // '*'

WS                "white space"               = [\n \t\r]+

COMMENT_LINE      "end-of-line comment"         = "//" content:( ![\r\n] . )* [\r\n] 
  { return { tag: 'COMMENT_LINE', content: content.map(x => x[1]).join('').trim() } }

COMMENT_MULTI     "multiline-comment"           = "/*" content:( !"*/" . )* "*/" 
  { return { tag: 'COMMENT_MULTI', content: content.map(x => x[1]).join('').trim() } }


// # Identifiers ============================

IDENT          "identifier"              = x:LETTER y:( LETTER / DIGIT / UBAR )*
  { return { tag:"IDENT", type: undefined, val: x + y } }

// # Types ==================================

Type            "type"                          = CompoundType
                                                / LPAREN Type RPAREN
                                                / TypeName

TypeName        "type name"                     = val:([a-z_]i+)
 { return { tag: "TYPE", type: { base: 'BASE', type: val.join('') } } }

CompoundType     "type literal"                  = ArrayType
                                                / ChannelType
                                                / FunctionType
                                                / PointerType

PointerType 	"pointer type" 					= ASTERISK inner:Type
	{ return { tag: "TYPE", type: { base: "PTR", inner } } }

ArrayType       "array type"                    = LBRACK len:Expression RBRACK elementType:Type
	{ return { tag: "TYPE", type: { base: "ARRAY", len, inner } } }

ChannelType     "channel type"                  = ChannelOutType / ChannelInType / ChannelDualType

ChannelDualType     "chan-dual type"                  = "chan" WS inner:Type
    { return { tag: "TYPE", type:{ base: "CHAN", mode: 'DUAL', inner } } }  

ChannelOutType     "chan-out type"                  = ARROW WS? "chan" WS inner:Type
    { return { tag: "TYPE", type:{ base: "CHAN", mode: 'OUT', inner } } }  

ChannelInType     "chan-in type"                  = "chan" WS? ARROW WS? inner:Type
	{ return { tag: "TYPE", type:{ base: "CHAN", mode: 'IN', inner } } }  

FunctionType      "function type"                 = "func" WS? inputT:FnParamListType WS? returnT:(Type?)
  { return { tag: "TYPE", type:{ base: "FUNC", inputT, returnT: returnT ?? [] } } }

FnParamListType       "function parameter type"   = LPAREN WS? a:Type b:(WS? ',' WS? Type)* WS? RPAREN
  { return [a, ...(b.map(bb => bb[3]))] }
                                                  / WS? LPAREN WS? RPAREN
  { return []; }

// # Blocks =================================

Block           "block"                         = LBRACE WS? stmts:StatementList WS? RBRACE
  { return { tag: "BLOCK", stmts } }

StatementList   "statement list"                = v:( Statement BD )*
  { return v.map(vv => vv[0]) }

// # Declarations and scope =================

Declaration     "declaration"                   = ConstDecl
                                                / VarDecl

TopLevelDecl    "top-level declaration"         = Declaration
                                                / FunctionDecl

// # Constant declarations ==================

ConstDecl       "constant declaration"          = "const" WS ident:IDENT identType:(Type?) EQUAL expr:Expression
  { return { tag: "CONST_DECL", ident, identType, expr } }

VarDecl         "variable declaration"          = "var" WS ident:IDENT identType:Type expr:(EQUAL expr:Expression)?
  { return { tag: "VAR_DECL", ident, identType, expr: (expr ?? [null, null])[1] } }

// # Function declarations ==================

FunctionDecl    "function declaration"          = "func" ident:IDENT inputT:FnParamListType WS? returnT:(Type?) body:Block
  { return { tag: "FUNC_DECL", ident, inputT, returnT: returnT ?? [], body } }

// # Expressions ============================

Operand         "operand"                       = v: Literal { return v; }
                                                / v: IDENT { return v; }
                                                / LPAREN v:Expression RPAREN { return v; }

Literal         "literal"                       = IntegerLit
                                                / StringLit
                                                / FunctionLit

IntegerLit     "integer literal"         = a:("0" /  [1-9] ) b:( ( UBAR )? DIGIT )*
  { return { tag: 'LITERAL', type: { base: 'BASE', inner: 'INT'}, val: a + b.map(i => i[1]).join('') } }

StringLit      "string literal"          = '\"' content:([a-z]i / [0-9] / [ \t] / [.,?!_])* '\"'
  { return { tag: 'LITERAL', type: { base: 'BASE', inner: 'STR'}, val: content.join('') } }

FunctionLit     "function literal"              = "func" inputT:FnParamListType WS? returnT:(Type?) body:Block
  { return { tag: "LITERAL", type:{ base: "FUNC", inputT, returnT: returnT ?? [] }, body } }
  
//////////////////////////STOOPPPEDD HERE STOPPED HERE BOING

// # Primary expressions ===================

PrimaryExpr     "primary expression"            = a:Operand b:((Selector / Index / Arguments)*)
  {
    // Note the '*' makes a standalone Operand a valid PrimaryExpr.
    return b.reduce((acc, curr) => {
      curr.expr = acc;
      return curr;
    }, a);
  }

Selector        "selector in expression"        = DOT ident:IDENT
  { return { tag: "SELECTOR", ident, expr: null /* to be filled when parsing PrimaryExpr */ } }

Index           "index in expression"           = LBRACK index:Expression RBRACK
  { return { tag: "INDEXOR", index, expr: null /* to be filled when parsing PrimaryExpr */ } }

Arguments       "arguments"                     = LPAREN WS? RPAREN
  { return { tag: "CALLER", args: [], expr: null /* to be filled when parsing PrimaryExpr */ } }
                                                / LPAREN WS? arg1:Expression WS? rest:(COMMA WS? Expression WS?)* RPAREN
  {
    const args = [arg1, ...(rest.map(r => r[2]))]
    return { tag: "CALLER", args, expr: null /* to be filled when parsing PrimaryExpr */ }
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
    return b.reduce((acc, curr) => {
      curr.expr = acc;
      return curr;
    }, a);
  }

// We use this to avoid left-recursion failure in the binary operators, and to enforce operator precedence.
BinaryExprL5    "binary expression level 5"     = a:UnaryExpr WS? b:(mul_op WS? UnaryExpr WS?)*
  {
    // Note the '*' makes a standalone UnaryExpr a valid BinaryExprL5.
    return b.reduce((acc, curr) => {
      curr = { tag: "BINARY_OP", op: curr[0], lhs:null, rhs: curr[2] }
      curr.lhs = acc;
      return curr;
    }, a);
  }
  
BinaryExprL4    "binary expression level 4"     = a:BinaryExprL5 WS? b:(add_op WS? BinaryExprL5 WS?)*
  {
    return b.reduce((acc, curr) => {
      curr = { tag: "BINARY_OP", op: curr[0], lhs:null, rhs: curr[2] }
      curr.lhs = acc;
      return curr;
    }, a);
  }

BinaryExprL3    "binary expression level 3"     = a:BinaryExprL4 WS? b:(rel_op WS? BinaryExprL4 WS?)*
  {
    return b.reduce((acc, curr) => {
      curr = { tag: "BINARY_OP", op: curr[0], lhs:null, rhs: curr[2] }
      curr.lhs = acc;
      return curr;
    }, a);
  }

BinaryExprL2    "binary expression level 2"     = a:BinaryExprL3 WS? b:(LAND WS? BinaryExprL3 WS?)*
  {
    return b.reduce((acc, curr) => {
      curr = { tag: "BINARY_OP", op: curr[0], lhs:null, rhs: curr[2] }
      curr.lhs = acc;
      return curr;
    }, a);
  }

BinaryExprL1    "binary expression level 1"     = a:BinaryExprL2 WS? b:(LOR WS? BinaryExprL2)*
  {
    return b.reduce((acc, curr) => {
      curr = { tag: "BINARY_OP", op: curr[0], lhs:null, rhs: curr[2] }
      curr.lhs = acc;
      return curr;
    }, a);
  }
  
unary_op        "unary operator"                = PLUS          // "+"
  { return { tag: "UNARY_OP", op: '+', expr: null } }
                                                / MINUS         // "-"
  { return { tag: "UNARY_OP", op: '-', expr: null } }
                                                / NOT           // "!"
  { return { tag: "UNARY_OP", op: '!', expr: null } }
                                                / NEG           // "^"
  { return { tag: "UNARY_OP", op: '^', expr: null } }
                                                / ADDR          // "*"
  { return { tag: "UNARY_OP", op: '&', expr: null } }
                                                / REFR          // "&"
  { return { tag: "UNARY_OP", op: '*', expr: null } }                                               
                                                / ARROW         // "<-"
  { return { tag: "UNARY_OP", op: '<-', expr: null } }

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
                                                / SimpleStmt
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

SimpleStmt      "simple statement"              = ExpressionStmt
                                                / SendStmt
                                                / IncDecStmt
                                                / Assignment

// # Labeled statements ===================

LabeledStmt     "labeled statement"             = label:IDENT WS? COLON WS? Statement
  { stmt.label = label; return stmt; }

// # Expression statements ================

ExpressionStmt  "expression statement"          = Expression

// # Send statements ======================

SendStmt        "send-statement"                = Expression WS? ARROW WS? Expression
  { return { tag: "STMT", expr: expr[0], value: expr[4] } }

// # IncDec statements ====================

IncDecStmt      "increment/decrement statement" = Expression ( INC / DEC )

// # Assignments ==========================

Assignment      "assignment"                    = ExpressionList assign_op ExpressionList

assign_op       "assignment operator"           = ( add_op / mul_op )? EQUAL

// # 'if' statements ======================

IfStmt  "'if' statement"  = "if" ( SimpleStmt BD )? Expression Block ( "else" ( IfStmt / Block ) )?

// # 'switch' statements ==================

SwitchStmt      "'switch' statement"            = ExprSwitchStmt
                                                / TypeSwitchStmt

// # Expression switches ------------------

ExprSwitchStmt  "expression of 'switch' statement"  = "switch" ( SimpleStmt BD )? ( Expression )? LBRACE ( ExprCaseClause )* RBRACE
ExprCaseClause  "expression of 'case' clause"       = ExprSwitchCase COLON StatementList
ExprSwitchCase  "expression of switch's 'case'"     = "case" ExpressionList
                                                    / "default"

// # Type switches -------------------------

TypeSwitchStmt  "type-switch statement"         = "switch" ( SimpleStmt BD )? TypeSwitchGuard LBRACE ( TypeCaseClause )* RBRACE
TypeSwitchGuard "type-switch guard"             = ( identifier DEFINE ) PrimaryExpr DOT LPAREN "type" RPAREN
TypeCaseClause  "type-switch clause"            = TypeSwitchCase COLON StatementList
TypeSwitchCase  "type-switch case"              = "case" TypeList
                                                / "default"

TypeList        "type list"                     = Type ( COMMA Type )*

// # 'for' statements ======================

ForStmt         "'for' statement"               = "for" ( Condition / ForClause / RangeClause ) Block
Condition       "'for' condition"               = Expression

// # 'for' statements with 'for' clause ----

ForClause       "'for' clause"                  = ( InitStmt )? BD ( Condition )? BD ( PostStmt )?
InitStmt        "initial statament in 'for'"    = SimpleStmt
PostStmt        "post statement in 'for'"       = SimpleStmt

// # 'for' statements with 'range' clause --

RangeClause     "'range' clause"                = ( ExpressionList EQUAL / IdentifierList DEFINE )? "range" Expression

// # 'go' statements =======================

GoStmt          "'go' statement"                = "go" Expression

// # 'select' statements ===================

SelectStmt      "'select' statement"            = "select" LBRACE ( CommClause )* RBRACE
CommClause      "communication-clause"          = CommCase COLON StatementList
CommCase        "comminucation 'case'"          = "case" ( SendStmt / RecvStmt )
                                                / "default"

RecvStmt        "receive-statement"             = ( ExpressionList EQUAL / IdentifierList DEFINE )? RecvExpr
RecvExpr        "receive-expression"            = Expression

// # 'return' statements ===================

ReturnStmt      "'return' statement"            = "return" ( ExpressionList )?

// # 'break' statements ====================

BreakStmt       "'break' statement"             = "break" ( Label )?

// # 'continue' statements =================

ContinueStmt    "'continue' statement"          = "continue" ( Label )?

// # 'goto' statements =====================

GotoStmt        "'goto' statement"              = "goto" Label

// # 'fallthrough' statements ==============

FallthroughStmt "'fallthrough' statement"       = "fallthrough"

// # 'defer' statements ====================

DeferStmt       "'defer' statement"             = "defer" Expression

// # Operators and delimiters ##################################################
// via https://github.com/golang/go/src/go/token/token.go

// # Keywords ===============================
// via https://github.com/golang/go/src/go/token/token.go

Keyword           "keyword"                     = "break"
                                                / "case"
                                                / "chan"
                                                / "const"
                                                / "continue"

                                                / "default"
                                                / "defer"
                                                / "else"
                                                / "fallthrough"
                                                / "for"

                                                / "func"
                                                / "go"
                                                / "goto"
                                                / "if"
                                                / "import"

                                                / "interface"
                                                / "map"
                                                / "package"
                                                / "range"
                                                / "return"

                                                / "select"
                                                / "struct"
                                                / "switch"
                                                / "type"
                                                / "var"

EOF             "end-of-file"                   = !.
