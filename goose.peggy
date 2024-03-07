// ##############################################################################################################
// # This file is a rewrite of the PIGEON spec as PEG spec, with heavy modifications. Original pigeon spec:
// # https://github.com/hachi8833/golang_spec_peg_pigen/blob/fc1556685adb4f494e1fe9371c3a32353a7ba797/golang.peg
// ##############################################################################################################

// # Source file organization ==============

SourceFile     "source file"             = PackageClause BD ( ImportDecl BD )* ( TopLevelDecl BD )* EOF

// # Characters =============================

NEWLINE        "newline"                 = [\n] / [\r\n]
LETTER         "letter"                  = [a-z]i
DIGIT          "digit"                   = [0-9]

// # primitive signs -----------------------

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

WHITESPACE        "white space"               = [\n \t\r]+

COMMENT_LINE      "end-of-line comment"         = "//" content:( ![\r\n] . )* [\r\n] 
  { return { tag: 'COMMENT_LINE', content: content.map(x => x[1]).join('').trim() } }

COMMENT_MULTI     "multiline-comment"           = "/*" content:( !"*/" . )* "*/" 
  { { tag: 'COMMENT_MULTI', content: content.map(x => x[1]).join('').trim() } }


// # Identifiers ============================

IDENT          "identifier"              = x:LETTER y:( LETTER / DIGIT / UBAR )*
  { return { tag:"IDENT", type: undefined, val: x + y } }

// # Literals =======================

integer        "integer literal"         = a:("0" /  [1-9] ) b:( ( UBAR )? DIGIT )*
  { return { tag: 'LITERAL', type: { base: 'BASE', inner: 'INT'}, val: a + b.map(i => i[1]).join('') } }

string_lit     "string literal"          = '\"' content:([a-z]i / [0-9] / [ \t] / [.,?!_])* '\"'
  { return { tag: 'LITERAL', type: { base: 'BASE', inner: 'STR'}, val: content.join('') } }

// # Types ==================================


Type            "type"                          = BaseTypeLit
                                                / LPAREN Type RPAREN
                                                / PointerType
                                                / TypeName

TypeName        "type name"                     = val:([a-z_]i+)
 { return { tag: "TYPE", type: { base: 'BASE', type: val.join('') } } }

BaseTypeLit     "type literal"                  = ArrayType
                                                / ChannelType

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


// # Function types -------------------------

FunctionType    "function type"                   = "func" Signature
Signature       "function signature"              = Parameters ( Result )?
Result          "function result"                 = Parameters
                                                  / Type
Parameters      "function parameters"             = LPAREN ( ParameterList ( COMMA )? )? RPAREN
ParameterList   "function parameter list"         = ParameterDecl ( COMMA ParameterDecl )?
ParameterDecl   "function parameter declaration"  = ( IdentifierList )? ( ELLIPSIS )? Type

// # Interface types ------------------------

InterfaceType      "interface type"             = "interface" LBRACE ( MethodSpec BD )? RBRACE
MethodSpec         "method specification"       = MethodName Signature
                                                / InterfaceTypeName

MethodName         "method name"                = identifier
InterfaceTypeName  "interface type name"        = TypeName

// # Map types ------------------------------

MapType         "map type"                      = "map" LBRACK KeyType RBRACK ElementType
KeyType         "map key type"                  = Type

// # Channel types --------------------------

ChannelType     "channel type"                  = ( "chan" / "chan" ARROW / ARROW "chan" ) ElementType

// # Blocks =================================

Block           "block"                         = LBRACE StatementList RBRACE
StatementList   "statement list"                = ( Statement BD )*

// # Declarations and scope =================

Declaration     "declaration"                   = ConstDecl
                                                / TypeDecl
                                                / VarDecl

TopLevelDecl    "top-level declaration"         = Declaration
                                                / FunctionDecl
                                                / MethodDecl

// # Constant declarations ==================

ConstDecl       "constant declaration"          = "const" ( ConstSpec / LPAREN ( ConstSpec BD )* RPAREN )
ConstSpec       "constant specification"        = IdentifierList ( ( Type )? EQUAL ExpressionList )?

IdentifierList  "identifier list"               = identifier ( COMMA identifier )*
ExpressionList  "expression list"               = Expression ( COMMA Expression )*

// # Type declarations ======================

TypeDecl        "type declaration"              = "type" ( TypeSpec / LPAREN ( TypeSpec BD )? RPAREN )
TypeSpec        "type specification"            = AliasDecl
                                                / TypeDef

// # Alias declarations =====================

AliasDecl       "type alias declaration"        = identifier EQUAL Type

// # Type definitions =======================

TypeDef         "type definition"               = identifier Type

// # Variable declarations ==================

VarDecl         "variable declaration"          = "var" ( VarSpec / LPAREN ( VarSpec BD )* RPAREN )
VarSpec         "variabpe specification"        = IdentifierList ( Type ( EQUAL ExpressionList )* / EQUAL ExpressionList )

// # Short variable declarations ============

ShortVarDecl    "short declaration of variable" = IdentifierList DEFINE ExpressionList

// # Function declarations ==================

FunctionDecl    "function declaration"          = "func" FunctionName Signature ( FunctionBody )?
FunctionName    "function name"                 = identifier
FunctionBody    "function body"                 = Block

// # Method declarations ====================

MethodDecl      "method declaration"            = "func" Receiver MethodName Signature ( FunctionBody )?
Receiver        "method receiver"               = Parameters

// # Expressions ============================

Operand         "operand"                       = Literal
                                                / OperandName
                                                / LPAREN Expression RPAREN

Literal         "literal"                       = BasicLit
                                                / CompositeLit
                                                / FunctionLit

BasicLit        "basic literal"                 = int_lit
                                                / float_lit
                                                / imaginary_lit
                                                / rune_lit
                                                / string_lit

OperandName     "operand name"                  = identifier
                                                / QualifiedIdent

// # Qualified identifiers ==================

QualifiedIdent  "qualified identifier"          = PackageName DOT identifier

// # Composite literals =====================

CompositeLit    "composite literal"             = LiteralType LiteralValue
LiteralType     "literal type"                  = StructType
                                                / ArrayType
                                                / LBRACK ELLIPSIS RBRACK ElementType
                                                / SliceType
                                                / MapType
                                                / TypeName

LiteralValue    "literal value"                 = LBRACE ( ElementList ( COMMA )? )? RBRACE
ElementList     "element list"                  = KeyedElement ( COMMA KeyedElement )*
KeyedElement    "keyed element"                 = ( Key COLON )? Element
Key             "key of element list"           = FieldName
                                                / Expression
                                                / LiteralValue

FieldName       "field name"                    = identifier
Element         "element of list"               = Expression
                                                / LiteralValue

// # Function literals =====================

FunctionLit     "function literal"              = "func" Signature FunctionBody

// # Primary expressions ===================

PrimaryExpr     "primary expression"            = Operand
                                                / Conversion
                                                / MethodExpr
                                                / PrimaryExpr Selector
                                                / PrimaryExpr Index
                                                / PrimaryExpr Slice
                                                / PrimaryExpr TypeAssertion
                                                / PrimaryExpr Arguments

Selector        "selector in expression"        = DOT identifier
Index           "index in expression"           = LBRACK Expression RBRACK
Slice           "slice in expression"           = LBRACK ( Expression )? COLON ( Expression )? RBRACK
                                                / LBRACK ( Expression )? COLON Expression COLON Expression RBRACK

TypeAssertion   "type assertion"                = DOT LPAREN Type RPAREN
Arguments       "arguments"                     = LPAREN ( ( ExpressionList / Type ( COMMA ExpressionList )? ) ( ELLIPSIS )? ( COMMA )? )? RPAREN

// # Method expressions ===================

MethodExpr      "method expression"             = ReceiverType DOT MethodName
ReceiverType    "receiver type"                 = Type

// # Operators ============================

// Precedence    Operator
//     5             *  /  %  <<  >>  &  &^
//     4             +  -  |  ^
//     3             ==  !=  <  <=  >  >=
//     2             &&
//     1             ||

Expression      "expression"                    = UnaryExpr
                                                / Expression binary_op Expression

UnaryExpr       "unary expression"              = PrimaryExpr
                                                / unary_op UnaryExpr

unary_op        "unary operator"                = PLUS          // "+"
                                                / MINUS         // "-"
                                                / NOT           // "!"
                                                / NEG           // "^"
                                                / ADDR          // "*"
                                                / REFR          // "&"
                                                / ARROW         // "<-"

binary_op       "binary operator"               = mul_op
                                                / add_op
                                                / rel_op
                                                / LAND          // "&&"
                                                / LOR           // "||"

rel_op          "comparison operator"           = EQL           // "=="
                                                / NEQ           // "!="
                                                / LSS           // "<"
                                                / LEQ           // "<="
                                                / GTR           // ">"
                                                / GEQ           // ">="

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

// # Conversions ==========================

Conversion      "type conversion"               = Type LPAREN Expression ( COMMA )? RPAREN

// # Statements ===========================

Statement       "statement"                     = Declaration
                                                / LabeledStmt
                                                / SimpleStm
                                                / GoStmt
                                                / ReturnStmt
                                                / BreakStmt
                                                / ContinueStmt
                                                / GotoStm
                                                / FallthroughStmt
                                                / Block
                                                / IfStmt
                                                / SwitchStmt
                                                / SelectStmt
                                                / ForStm
                                                / DeferStmt

SimpleStmt      "simple statement"              = EmptyStmt
                                                / ExpressionStmt
                                                / SendStmt
                                                / IncDecStmt
                                                / Assignment
                                                / ShortVarDecl

// # Empty statements =====================

EmptyStmt       "empty statement"               = ""

// # Labeled statements ===================

LabeledStmt     "labeled statement"             = Label COLON Statement
Label           "label"                         = identifier

// # Expression statements ================

ExpressionStmt  "expression statement"          = Expression

// # Send statements ======================

SendStmt        "send-statement"                = Channel ARROW Expression
Channel         "channel"                       = Expression

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
