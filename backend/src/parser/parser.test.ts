import { parse } from ".";

test('first test', () => {
  expect(parse(`

func main() {
  messages := make(chan string)
  
 
 
  go func() { messages <- "ping" }()
  msg := <-messages
  Println(msg)
}  
  
  `)).toEqual([
    {
      tag: 'FUNC_DECL',
      ident: {
        tag: 'IDENT',
        type: null,
        val: 'main'
      },
      inputT: [],
      returnT: [],
      body: {
        tag: 'BLOCK',
        stmts: [
          {
            tag: 'STMT',
            stmtType: 'ASSIGN',
            lhs: {
              tag: 'IDENT',
              type: null,
              val: 'messages'
            },
            rhs: {
              tag: 'MAKE',
              args: [
                {
                  tag: 'TYPE',
                  type: {
                    base: 'CHAN',
                    inner: {
                      tag: 'TYPE',
                      type: {
                        base: 'STR'
                      }
                    },
                    mode: 'DUAL'
                  }
                }
              ]
            },
            op: ':='
          },
          {
            tag: 'STMT',
            stmtType: 'GO',
            stmt: {
              tag: 'CALL',
              func: {
                tag: 'LITERAL',
                type: {
                  tag: 'TYPE',
                  type: {
                    base: 'FUNC',
                    inputT: [],
                    returnT: []
                  }
                },
                body: {
                  tag: 'BLOCK',
                  stmts: [
                    {
                      tag: 'STMT',
                      stmtType: 'EXPR',
                      expr: {
                        tag: 'BINARY_EXPR',
                        lhs: {
                          tag: 'IDENT',
                          type: null,
                          val: 'messages'
                        },
                        op: '<',
                        rhs: {
                          tag: 'UNARY_EXPR',
                          expr: {
                            tag: 'LITERAL',
                            type: {
                              tag: 'TYPE',
                              type: {
                                base: 'STR'
                              }
                            },
                            val: 'ping'
                          },
                          op: '-'
                        }
                      }
                    }
                  ]
                }
              },
              args: []
            }
          },
          {
            tag: 'STMT',
            stmtType: 'ASSIGN',
            lhs: {
              tag: 'IDENT',
              type: null,
              val: 'msg'
            },
            rhs: {
              tag: 'UNARY_EXPR',
              expr: {
                tag: 'IDENT',
                type: null,
                val: 'messages'
              },
              op: '<-'
            },
            op: ':='
          },
          {
            tag: 'STMT',
            stmtType: 'EXPR',
            expr: {
              tag: 'CALL',
              func: {
                tag: 'IDENT',
                type: null,
                val: 'Println'
              },
              args: [
                {
                  tag: 'IDENT',
                  type: null,
                  val: 'msg'
                }
              ]
            }
          }
        ]
      }
    }
  ]);
});