import { AnyTypeObj, FuncLiteralObj, IdentObj, ProgramObj, parse } from ".";

describe("peggy parsing tests", () => {
  test("arbitrary parsing test", () => {
    expect(
      parse(`

func main() {
  messages := make(chan string)
  
 
 
  go func() { messages <- "ping" }()
  msg := <-messages
  Println(msg)
}  
  
  `)
    ).toEqual([
      {
        tag: "STMT",
        stmtType: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "main",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: { base: "FUNC", inputT: [], returnT: null },
          },
          input: [],
          body: {
            tag: "STMT",
            stmtType: "BLOCK",
            stmts: [
              {
                tag: "STMT",
                stmtType: "ASSIGN",
                lhs: {
                  tag: "IDENT",
                  val: "messages",
                },
                rhs: {
                  tag: "SYS_CALL",
                  sym: "make",
                  type: {
                    tag: "TYPE",
                    type: {
                      base: "CHAN",
                      inner: {
                        tag: "TYPE",
                        type: {
                          base: "STR",
                        },
                      },
                      mode: "DUAL",
                    },
                  },
                  args: [],
                },
                op: ":=",
              },
              {
                tag: "STMT",
                stmtType: "GO",
                expr: {
                  tag: "CALL",
                  func: {
                    tag: "LITERAL",
                    type: {
                      tag: "TYPE",
                      type: {
                        base: "FUNC",
                        inputT: [],
                        returnT: null,
                      },
                    },
                    input: [],
                    body: {
                      tag: "STMT",
                      stmtType: "BLOCK",
                      stmts: [
                        {
                          tag: "STMT",
                          stmtType: "EXPR",
                          expr: {
                            tag: "BINARY_EXPR",
                            lhs: {
                              tag: "IDENT",
                              val: "messages",
                            },
                            op: "<",
                            rhs: {
                              tag: "UNARY_EXPR",
                              expr: {
                                tag: "LITERAL",
                                type: {
                                  tag: "TYPE",
                                  type: {
                                    base: "STR",
                                  },
                                },
                                val: "ping",
                              },
                              op: "-",
                            },
                          },
                        },
                      ],
                    },
                  } satisfies FuncLiteralObj,
                  args: [],
                },
              },
              {
                tag: "STMT",
                stmtType: "ASSIGN",
                lhs: {
                  tag: "IDENT",
                  val: "msg",
                },
                rhs: {
                  tag: "UNARY_EXPR",
                  expr: {
                    tag: "IDENT",
                    val: "messages",
                  },
                  op: "<-",
                },
                op: ":=",
              },
              {
                tag: "STMT",
                stmtType: "EXPR",
                expr: {
                  tag: "CALL",
                  func: {
                    tag: "IDENT",
                    val: "Println",
                  },
                  args: [
                    {
                      tag: "IDENT",
                      val: "msg",
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    ] satisfies ProgramObj);
  });

  test("empty fn test", () => {
    expect(
      parse(`

func main() {
  
 
 
}  

func x() int {
  return 1
}
  `)
    ).toEqual([
      {
        ident: {
          tag: "IDENT",
          val: "main",
        },
        tag: "STMT",
        stmtType: "FUNC_DECL",
        lit: {
          input: [],
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: { base: "FUNC", inputT: [], returnT: null },
          },
          body: {
            stmts: [],
            tag: "STMT",
            stmtType: "BLOCK",
          },
        },
      },
      {
        ident: {
          tag: "IDENT",
          val: "x",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: {
              base: "FUNC",
              inputT: [],
              returnT: {
                tag: "TYPE",
                type: {
                  base: "INT",
                },
              },
            },
          },
          input: [],
          body: {
            stmts: [
              {
                expr: {
                  tag: "LITERAL",
                  type: {
                    tag: "TYPE",
                    type: {
                      base: "INT",
                    },
                  },
                  val: 1,
                },
                stmtType: "RETURN",
                tag: "STMT",
              },
            ],
            tag: "STMT",
            stmtType: "BLOCK",
          },
        },
        tag: "STMT",
        stmtType: "FUNC_DECL",
      },
    ] satisfies ProgramObj);
  });

  test("for loop test", () => {
    expect(
      parse(`
    func main() {
      var y int
      sum := 0

      for i := 0; i < 10; i++ {
        sum := 1 + y
      }
    }
  `)
    ).toEqual([
      {
        ident: {
          tag: "IDENT",
          val: "main",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: { base: "FUNC", inputT: [], returnT: null },
          },
          input: [],
          body: {
            stmts: [
              {
                ident: {
                  tag: "IDENT",
                  val: "y",
                },
                tag: "STMT",
                stmtType: "VAR_DECL",
                type: {
                  tag: "TYPE",
                  type: {
                    base: "INT",
                  },
                },
                val: null,
              },
              {
                lhs: {
                  tag: "IDENT",
                  val: "sum",
                },
                op: ":=",
                rhs: {
                  tag: "LITERAL",
                  type: {
                    tag: "TYPE",
                    type: {
                      base: "INT",
                    },
                  },
                  val: 0,
                },
                stmtType: "ASSIGN",
                tag: "STMT",
              },
              {
                body: {
                  stmts: [
                    {
                      lhs: {
                        tag: "IDENT",
                        val: "sum",
                      },
                      op: ":=",
                      rhs: {
                        lhs: {
                          tag: "LITERAL",
                          type: {
                            tag: "TYPE",
                            type: {
                              base: "INT",
                            },
                          },
                          val: 1,
                        },
                        op: "+",
                        rhs: {
                          tag: "IDENT",
                          val: "y",
                        },
                        tag: "BINARY_EXPR",
                      },
                      stmtType: "ASSIGN",
                      tag: "STMT",
                    },
                  ],
                  tag: "STMT",
                  stmtType: "BLOCK",
                },
                cond: {
                  lhs: {
                    tag: "IDENT",
                    val: "i",
                  },
                  op: "<",
                  rhs: {
                    tag: "LITERAL",
                    type: {
                      tag: "TYPE",
                      type: {
                        base: "INT",
                      },
                    },
                    val: 10,
                  },
                  tag: "BINARY_EXPR",
                },
                post: {
                  expr: {
                    tag: "IDENT",
                    val: "i",
                  },
                  stmtType: "INC",
                  tag: "STMT",
                },
                pre: {
                  lhs: {
                    tag: "IDENT",
                    val: "i",
                  },
                  op: ":=",
                  rhs: {
                    tag: "LITERAL",
                    type: {
                      tag: "TYPE",
                      type: {
                        base: "INT",
                      },
                    },
                    val: 0,
                  },
                  stmtType: "ASSIGN",
                  tag: "STMT",
                },
                stmtType: "FOR",
                tag: "STMT",
              },
            ],
            tag: "STMT",
            stmtType: "BLOCK",
          },
        },
        tag: "STMT",
        stmtType: "FUNC_DECL",
      },
    ] satisfies ProgramObj);
  });

  test("empty for loop test", () => {
    expect(
      parse(`
    func main() {
      var y int
      sum := 0

      for {

      }
    }
  `)
    ).toEqual([
      {
        ident: {
          tag: "IDENT",
          val: "main",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: { base: "FUNC", inputT: [], returnT: null },
          },
          body: {
            stmts: [
              {
                ident: {
                  tag: "IDENT",
                  val: "y",
                },
                tag: "STMT",
                stmtType: "VAR_DECL",
                type: {
                  tag: "TYPE",
                  type: {
                    base: "INT",
                  },
                },
                val: null,
              },
              {
                lhs: {
                  tag: "IDENT",
                  val: "sum",
                },
                op: ":=",
                rhs: {
                  tag: "LITERAL",
                  type: {
                    tag: "TYPE",
                    type: {
                      base: "INT",
                    },
                  },
                  val: 0,
                },
                stmtType: "ASSIGN",
                tag: "STMT",
              },
              {
                body: {
                  stmts: [],
                  tag: "STMT",
                  stmtType: "BLOCK",
                },
                cond: null,
                post: null,
                pre: null,
                stmtType: "FOR",
                tag: "STMT",
              },
            ],
            tag: "STMT",
            stmtType: "BLOCK",
          },
          input: [],
        },
        tag: "STMT",
        stmtType: "FUNC_DECL",
      },
    ] satisfies ProgramObj);
  });

  test("parse call expressions", () => {
    expect(
      parse(`
    func main() {
      Println("Hello, World!")
      foo(1, "!")
      bar(1, "!", k)
    }`)
    ).toEqual([
      {
        ident: {
          tag: "IDENT",
          val: "main",
        },
        tag: "STMT",
        stmtType: "FUNC_DECL",
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: {
              base: "FUNC",
              inputT: [],
              returnT: null,
            },
          },
          input: [],
          body: {
            stmts: [
              {
                expr: {
                  args: [
                    {
                      tag: "LITERAL",
                      type: {
                        tag: "TYPE",
                        type: {
                          base: "STR",
                        },
                      },
                      val: "Hello, World!",
                    },
                  ],
                  func: {
                    tag: "IDENT",
                    val: "Println",
                  },
                  tag: "CALL",
                },
                stmtType: "EXPR",
                tag: "STMT",
              },
              {
                expr: {
                  args: [
                    {
                      tag: "LITERAL",
                      type: {
                        tag: "TYPE",
                        type: {
                          base: "INT",
                        },
                      },
                      val: 1,
                    },
                    {
                      tag: "LITERAL",
                      type: {
                        tag: "TYPE",
                        type: {
                          base: "STR",
                        },
                      },
                      val: "!",
                    },
                  ],
                  func: {
                    tag: "IDENT",
                    val: "foo",
                  },
                  tag: "CALL",
                },
                stmtType: "EXPR",
                tag: "STMT",
              },
              {
                expr: {
                  args: [
                    {
                      tag: "LITERAL",
                      type: {
                        tag: "TYPE",
                        type: {
                          base: "INT",
                        },
                      },
                      val: 1,
                    },
                    {
                      tag: "LITERAL",
                      type: {
                        tag: "TYPE",
                        type: {
                          base: "STR",
                        },
                      },
                      val: "!",
                    },
                    {
                      tag: "IDENT",
                      val: "k",
                    },
                  ],
                  func: {
                    tag: "IDENT",
                    val: "bar",
                  },
                  tag: "CALL",
                },
                stmtType: "EXPR",
                tag: "STMT",
              },
            ],
            tag: "STMT",
            stmtType: "BLOCK",
          },
        },
      },
    ] satisfies ProgramObj);
  });

  test("parse fn types", () => {
    expect(
      parse(`
      var Println func(string) 
      var foo func(int, string) bool
      var goo func(string, int, chan<- int) <- chan <- chan int
    `)
    ).toEqual([
      {
        ident: { tag: "IDENT", val: "Println" },
        tag: "STMT",
        stmtType: "VAR_DECL",
        type: {
          tag: "TYPE",
          type: {
            base: "FUNC",
            inputT: [{ tag: "TYPE", type: { base: "STR" } }],
            returnT: null,
          },
        },
        val: null,
      },
      {
        ident: { tag: "IDENT", val: "foo" },
        tag: "STMT",
        stmtType: "VAR_DECL",
        type: {
          tag: "TYPE",
          type: {
            base: "FUNC",
            inputT: [
              { tag: "TYPE", type: { base: "INT" } },
              { tag: "TYPE", type: { base: "STR" } },
            ],
            returnT: { tag: "TYPE", type: { base: "BOOL" } },
          },
        },
        val: null,
      },
      {
        ident: { tag: "IDENT", val: "goo" },
        tag: "STMT",
        stmtType: "VAR_DECL",
        type: {
          tag: "TYPE",
          type: {
            base: "FUNC",
            inputT: [
              { tag: "TYPE", type: { base: "STR" } },
              { tag: "TYPE", type: { base: "INT" } },
              {
                tag: "TYPE",
                type: {
                  base: "CHAN",
                  inner: { tag: "TYPE", type: { base: "INT" } },
                  mode: "IN",
                },
              },
            ],
            returnT: {
              tag: "TYPE",
              type: {
                base: "CHAN",
                inner: {
                  tag: "TYPE",
                  type: {
                    base: "CHAN",
                    inner: { tag: "TYPE", type: { base: "INT" } },
                    mode: "OUT",
                  },
                },
                mode: "OUT",
              },
            },
          },
        },
        val: null,
      },
    ] satisfies ProgramObj);
  });

  test("parse fn def", () => {
    expect(
      parse(`
      func Println(x string) { }
      func Println2(x, y string) { }
      func foo(x int, y string) bool { return true }
      func goo(x string, k1 ,k2 int, c chan<- int) <- chan <- chan int { return nil }
    `)
    ).toEqual([
      {
        tag: "STMT",
        stmtType: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "Println",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: {
              base: "FUNC",
              inputT: [
                {
                  tag: "TYPE",
                  type: {
                    base: "STR",
                  },
                },
              ],
              returnT: null,
            },
          },
          input: [
            {
              ident: {
                tag: "IDENT",
                val: "x",
              } satisfies IdentObj,
              type: {
                tag: "TYPE",
                type: {
                  base: "STR",
                },
              } satisfies AnyTypeObj,
            },
          ],
          body: {
            tag: "STMT",
            stmtType: "BLOCK",
            stmts: [],
          },
        },
      },
      {
        tag: "STMT",
        stmtType: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "Println2",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: {
              base: "FUNC",

              inputT: [
                {
                  tag: "TYPE",
                  type: {
                    base: "STR",
                  },
                },
                {
                  tag: "TYPE",
                  type: {
                    base: "STR",
                  },
                },
              ],
              returnT: null,
            },
          },

          input: [
            {
              ident: {
                tag: "IDENT",
                val: "x",
              },
              type: {
                tag: "TYPE",
                type: {
                  base: "STR",
                },
              },
            },
            {
              ident: {
                tag: "IDENT",
                val: "y",
              },
              type: {
                tag: "TYPE",
                type: {
                  base: "STR",
                },
              },
            },
          ],
          body: {
            tag: "STMT",
            stmtType: "BLOCK",
            stmts: [],
          },
        },
      },
      {
        tag: "STMT",
        stmtType: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "foo",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: {
              base: "FUNC",
              inputT: [
                {
                  tag: "TYPE",
                  type: {
                    base: "INT",
                  },
                },
                {
                  tag: "TYPE",
                  type: {
                    base: "STR",
                  },
                },
              ],
              returnT: {
                tag: "TYPE",
                type: {
                  base: "BOOL",
                },
              },
            },
          },
          input: [
            {
              ident: {
                tag: "IDENT",
                val: "x",
              },
              type: {
                tag: "TYPE",
                type: {
                  base: "INT",
                },
              },
            },
            {
              ident: {
                tag: "IDENT",
                val: "y",
              },
              type: {
                tag: "TYPE",
                type: {
                  base: "STR",
                },
              },
            },
          ],
          body: {
            tag: "STMT",
            stmtType: "BLOCK",
            stmts: [
              {
                tag: "STMT",
                stmtType: "RETURN",
                expr: {
                  tag: "LITERAL",
                  type: {
                    tag: "TYPE",
                    type: {
                      base: "BOOL",
                    },
                  },
                  val: true,
                },
              },
            ],
          },
        },
      },
      {
        tag: "STMT",
        stmtType: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "goo",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: {
              base: "FUNC",
              inputT: [
                {
                  tag: "TYPE",
                  type: {
                    base: "STR",
                  },
                },
                {
                  tag: "TYPE",
                  type: {
                    base: "INT",
                  },
                },
                {
                  tag: "TYPE",
                  type: {
                    base: "INT",
                  },
                },
                {
                  tag: "TYPE",
                  type: {
                    base: "CHAN",
                    inner: {
                      tag: "TYPE",
                      type: {
                        base: "INT",
                      },
                    },
                    mode: "IN",
                  },
                },
              ],
              returnT: {
                tag: "TYPE",
                type: {
                  base: "CHAN",
                  inner: {
                    tag: "TYPE",
                    type: {
                      base: "CHAN",
                      inner: {
                        tag: "TYPE",
                        type: {
                          base: "INT",
                        },
                      },
                      mode: "OUT",
                    },
                  },
                  mode: "OUT",
                },
              },
            },
          },
          input: [
            {
              ident: {
                tag: "IDENT",
                val: "x",
              },
              type: {
                tag: "TYPE",
                type: {
                  base: "STR",
                },
              },
            },
            {
              ident: {
                tag: "IDENT",
                val: "k1",
              },
              type: {
                tag: "TYPE",
                type: {
                  base: "INT",
                },
              },
            },
            {
              ident: {
                tag: "IDENT",
                val: "k2",
              },
              type: {
                tag: "TYPE",
                type: {
                  base: "INT",
                },
              },
            },
            {
              ident: {
                tag: "IDENT",
                val: "c",
              },
              type: {
                tag: "TYPE",
                type: {
                  base: "CHAN",
                  inner: {
                    tag: "TYPE",
                    type: {
                      base: "INT",
                    },
                  },
                  mode: "IN",
                },
              },
            },
          ],
          body: {
            tag: "STMT",
            stmtType: "BLOCK",
            stmts: [
              {
                tag: "STMT",
                stmtType: "RETURN",
                expr: {
                  tag: "IDENT",
                  val: "nil",
                },
              },
            ],
          },
        },
      },
    ] satisfies ProgramObj);
  });

  test("parse labelled stmts", () => {
    expect(
      parse(`
    func main() {
L1:   for {
        break
        break L1
        continue
        continue L1
      }
    }
`)
    ).toEqual([
      {
        ident: {
          tag: "IDENT",
          val: "main",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: { base: "FUNC", inputT: [], returnT: null },
          },
          body: {
            stmts: [
              {
                body: {
                  stmts: [
                    {
                      breakLabel: null,
                      stmtType: "BREAK",
                      tag: "STMT",
                    },
                    {
                      breakLabel: {
                        tag: "IDENT",
                        val: "L1",
                      },
                      stmtType: "BREAK",
                      tag: "STMT",
                    },
                    {
                      contLabel: null,
                      stmtType: "CONTINUE",
                      tag: "STMT",
                    },
                    {
                      contLabel: {
                        tag: "IDENT",
                        val: "L1",
                      },
                      stmtType: "CONTINUE",
                      tag: "STMT",
                    },
                  ],
                  tag: "STMT",
                  stmtType: "BLOCK",
                },
                cond: null,
                label: {
                  tag: "IDENT",
                  val: "L1",
                },
                post: null,
                pre: null,
                stmtType: "FOR",
                tag: "STMT",
              },
            ],
            tag: "STMT",
            stmtType: "BLOCK",
          },
          input: [],
        },
        tag: "STMT",
        stmtType: "FUNC_DECL",
      },
    ] satisfies ProgramObj);
  });

  test("parse switch stmts", () => {
    expect(
      parse(`
    func main() {
      switch t {
      case 2: g++
      case 4: i++
      case d: { i++ }
      case i: {
        i++
        i--
      }
      default: i=0
      }

      switch  {
        case true: g++
        case false: { k-- }
        default: { i++ }
      }
    }
    `)
    ).toEqual([
      {
        tag: "STMT",
        stmtType: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "main",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: { base: "FUNC", inputT: [], returnT: null },
          },
          input: [],
          body: {
            tag: "STMT",
            stmtType: "BLOCK",
            stmts: [
              {
                tag: "STMT",
                stmtType: "SWITCH",
                pre: null,
                cond: {
                  tag: "IDENT",
                  val: "t",
                },
                cases: [
                  {
                    tag: "CASE_CLAUSE",
                    case: {
                      tag: "LITERAL",
                      type: {
                        tag: "TYPE",
                        type: {
                          base: "INT",
                        },
                      },
                      val: 2,
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "g",
                        },
                      },
                    ],
                  },
                  {
                    tag: "CASE_CLAUSE",
                    case: {
                      tag: "LITERAL",
                      type: {
                        tag: "TYPE",
                        type: {
                          base: "INT",
                        },
                      },
                      val: 4,
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                    ],
                  },
                  {
                    tag: "CASE_CLAUSE",
                    case: {
                      tag: "IDENT",
                      val: "d",
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                    ],
                  },
                  {
                    tag: "CASE_CLAUSE",
                    case: {
                      tag: "IDENT",
                      val: "i",
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                      {
                        tag: "STMT",
                        stmtType: "DEC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                    ],
                  },
                  {
                    tag: "CASE_CLAUSE",
                    case: "DEFAULT",
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "ASSIGN",
                        lhs: {
                          tag: "IDENT",
                          val: "i",
                        },
                        rhs: {
                          tag: "LITERAL",
                          type: {
                            tag: "TYPE",
                            type: {
                              base: "INT",
                            },
                          },
                          val: 0,
                        },
                        op: "=",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "STMT",
                stmtType: "SWITCH",
                pre: null,
                cond: {
                  tag: "LITERAL",
                  type: { tag: "TYPE", type: { base: "BOOL" } },
                  val: true,
                },
                cases: [
                  {
                    tag: "CASE_CLAUSE",
                    case: {
                      tag: "LITERAL",
                      type: {
                        tag: "TYPE",
                        type: {
                          base: "BOOL",
                        },
                      },
                      val: true,
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "g",
                        },
                      },
                    ],
                  },
                  {
                    tag: "CASE_CLAUSE",
                    case: {
                      tag: "LITERAL",
                      type: {
                        tag: "TYPE",
                        type: {
                          base: "BOOL",
                        },
                      },
                      val: false,
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "DEC",
                        expr: {
                          tag: "IDENT",
                          val: "k",
                        },
                      },
                    ],
                  },
                  {
                    tag: "CASE_CLAUSE",
                    case: "DEFAULT",
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ] satisfies ProgramObj);
  });

  test("parse select stmts", () => {
    expect(
      parse(`
      func main() {
        select {
        case i<-k: g++
        case kk := <- k: i++
        case kk := <- k: { i++ }
        case kk := <- k: {
          i++
          i--
        }
        case k<-i: i--
        default: i=0
        }
      }`)
    ).toEqual([
      {
        tag: "STMT",
        stmtType: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "main",
        },
        lit: {
          tag: "LITERAL",
          type: {
            tag: "TYPE",
            type: { base: "FUNC", inputT: [], returnT: null },
          },
          input: [],
          body: {
            tag: "STMT",
            stmtType: "BLOCK",
            stmts: [
              {
                tag: "STMT",
                stmtType: "SELECT",
                cases: [
                  {
                    tag: "SELECT_CASE",
                    comm: {
                      sendCh: {
                        tag: "IDENT",
                        val: "i",
                      },
                      val: {
                        tag: "IDENT",
                        val: "k",
                      },
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "g",
                        },
                      },
                    ],
                  },
                  {
                    tag: "SELECT_CASE",
                    comm: {
                      recvCh: {
                        tag: "IDENT",
                        val: "k",
                      },
                      to: {
                        tag: "IDENT",
                        val: "kk",
                      },
                      op: ":=",
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                    ],
                  },
                  {
                    tag: "SELECT_CASE",
                    comm: {
                      recvCh: {
                        tag: "IDENT",
                        val: "k",
                      },
                      to: {
                        tag: "IDENT",
                        val: "kk",
                      },
                      op: ":=",
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                    ],
                  },
                  {
                    tag: "SELECT_CASE",
                    comm: {
                      recvCh: {
                        tag: "IDENT",
                        val: "k",
                      },
                      to: {
                        tag: "IDENT",
                        val: "kk",
                      },
                      op: ":=",
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "INC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                      {
                        tag: "STMT",
                        stmtType: "DEC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                    ],
                  },
                  {
                    tag: "SELECT_CASE",
                    comm: {
                      sendCh: {
                        tag: "IDENT",
                        val: "k",
                      },
                      val: {
                        tag: "IDENT",
                        val: "i",
                      },
                    },
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "DEC",
                        expr: {
                          tag: "IDENT",
                          val: "i",
                        },
                      },
                    ],
                  },
                  {
                    tag: "SELECT_CASE",
                    comm: "DEFAULT",
                    body: [
                      {
                        tag: "STMT",
                        stmtType: "ASSIGN",
                        lhs: {
                          tag: "IDENT",
                          val: "i",
                        },
                        rhs: {
                          tag: "LITERAL",
                          type: {
                            tag: "TYPE",
                            type: {
                              base: "INT",
                            },
                          },
                          val: 0,
                        },
                        op: "=",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ] satisfies ProgramObj);
  });
});
