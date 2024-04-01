import { parse } from ".";

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
        tag: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "main",
        },
        input: [],
        returnT: null,
        body: {
          tag: "BLOCK",
          stmts: [
            {
              tag: "STMT",
              stmtType: "ASSIGN",
              lhs: {
                tag: "IDENT",
                val: "messages",
              },
              rhs: {
                tag: "MAKE",
                args: [
                  {
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
                ],
              },
              op: ":=",
            },
            {
              tag: "STMT",
              stmtType: "GO",
              stmt: {
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
                  body: {
                    tag: "BLOCK",
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
                },
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
    ]);
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
        body: {
          stmts: [],
          tag: "BLOCK",
        },
        ident: {
          tag: "IDENT",
          val: "main",
        },
        input: [],
        returnT: null,
        tag: "FUNC_DECL",
      },
      {
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
          tag: "BLOCK",
        },
        ident: {
          tag: "IDENT",
          val: "x",
        },
        input: [],
        returnT: {
          tag: "TYPE",
          type: {
            base: "INT",
          },
        },
        tag: "FUNC_DECL",
      },
    ]);
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
        body: {
          stmts: [
            {
              ident: {
                tag: "IDENT",
                val: "y",
              },
              tag: "VAR_DECL",
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
                tag: "BLOCK",
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
          tag: "BLOCK",
        },
        ident: {
          tag: "IDENT",
          val: "main",
        },
        input: [],
        returnT: null,
        tag: "FUNC_DECL",
      },
    ]);
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
        body: {
          stmts: [
            {
              ident: {
                tag: "IDENT",
                val: "y",
              },
              tag: "VAR_DECL",
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
                tag: "BLOCK",
              },
              cond: null,
              post: null,
              pre: null,
              stmtType: "FOR",
              tag: "STMT",
            },
          ],
          tag: "BLOCK",
        },
        ident: {
          tag: "IDENT",
          val: "main",
        },
        input: [],
        returnT: null,
        tag: "FUNC_DECL",
      },
    ]);
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
          tag: "BLOCK",
        },
        ident: {
          tag: "IDENT",
          val: "main",
        },
        input: [],
        returnT: null,
        tag: "FUNC_DECL",
      },
    ]);
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
        tag: "VAR_DECL",
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
        tag: "VAR_DECL",
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
        tag: "VAR_DECL",
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
    ]);
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
        tag: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "Println",
        },
        input: [
          [
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
          ],
        ],
        returnT: null,
        body: {
          tag: "BLOCK",
          stmts: [],
        },
      },
      {
        tag: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "Println2",
        },
        input: [
          [
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
        ],
        returnT: null,
        body: {
          tag: "BLOCK",
          stmts: [],
        },
      },
      {
        tag: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "foo",
        },
        input: [
          [
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
          ],
          [
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
        ],
        returnT: {
          tag: "TYPE",
          type: {
            base: "BOOL",
          },
        },
        body: {
          tag: "BLOCK",
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
      {
        tag: "FUNC_DECL",
        ident: {
          tag: "IDENT",
          val: "goo",
        },
        input: [
          [
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
          ],
          [
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
          ],
          [
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
        body: {
          tag: "BLOCK",
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
    ]);
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
                tag: "BLOCK",
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
          tag: "BLOCK",
        },
        ident: {
          tag: "IDENT",
          val: "main",
        },
        input: [],
        returnT: null,
        tag: "FUNC_DECL",
      },
    ]);
  });
});
