import { Instruction } from "../instruction/base";
import { StmtObj } from "../parser";

// Dummy function, just for testing.
export function compileSmt(s: StmtObj, pf: ProgramFile) {
  switch (s.stmtType) {
    case "VAR_DECL":
    case "CONST_DECL":
    case "EXPR":
      

    case "SEND":
    case "INC":
    case "DEC":
    case "ASSIGN":
    case "IF":
    case "SWITCH":
    case "SELECT":
    case "FOR":
    case "BREAK":
    case "CONTINUE":
    case "GOTO":
    case "FALLTHROUGH":
    case "DEFER":
    case "GO":
    case "RETURN":
      return;
  }
}



function compile(parsedObj: StmtObj): ProgramFile {
  let pf: ProgramFile = {
    instructions: new Array<Instruction>
  }
  compileSmt(parsedObj, pf)
  return pf
}

export type ProgramFile = {
  instructions: Array<Instruction>;
};


   
const compile_comp = {
  lit:
      (comp, ce) => {
          instrs[wc++] = { tag: "LDC", 
                           val: comp.val
          }
      },
  nam:
      // store precomputed position information in LD instruction
      (comp, ce) => {
          instrs[wc++] = { tag: "LD", 
                           sym: comp.sym,
                           pos: compile_time_environment_position(
                                    ce, comp.sym)
                          }
      },
  unop:
      (comp, ce) => {
          compile(comp.frst, ce)
          instrs[wc++] = {tag: 'UNOP', sym: comp.sym}
      },
  binop:
      (comp, ce) => {
          compile(comp.frst, ce)
          compile(comp.scnd, ce)
          instrs[wc++] = {tag: 'BINOP', sym: comp.sym}
      },
  log:
      (comp, ce) => {
          compile(comp.sym == '&&' 
                  ? {tag: 'cond_expr', 
                     pred: comp.frst, 
                     cons: {tag: 'lit', val: true},
                     alt: comp.scnd}
                  : {tag: 'cond_expr',  
                     pred: cmd.frst,
                     cons: cmd.scnd, 
                     alt: {tag: 'lit', val: false}},
                ce)
      },
  cond: 
      (comp, ce) => {
          compile(comp.pred, ce)
          const jump_on_false_instruction = {tag: 'JOF'}
          instrs[wc++] = jump_on_false_instruction
          compile(comp.cons, ce)
          const goto_instruction = { tag: 'GOTO' }
          instrs[wc++] = goto_instruction;
          const alternative_address = wc;
          jump_on_false_instruction.addr = alternative_address;
          compile(comp.alt, ce)
          goto_instruction.addr = wc
      },
  while:
      (comp, ce) => {
          const loop_start = wc
          compile(comp.pred, ce)
          const jump_on_false_instruction = {tag: 'JOF'}
          instrs[wc++] = jump_on_false_instruction
          compile(comp.body, ce)
          instrs[wc++] = {tag: 'POP'}
          instrs[wc++] = {tag: 'GOTO', addr: loop_start}
          jump_on_false_instruction.addr = wc
          instrs[wc++] = {tag: 'LDC', val: undefined}
      }, 
  app:
      (comp, ce) => {
          compile(comp.fun, ce)
          for (let arg of comp.args) {
              compile(arg, ce)
          }
          instrs[wc++] = {tag: 'CALL', arity: comp.args.length}
      },
  assmt:
      // store precomputed position info in ASSIGN instruction
      (comp, ce) => {
          compile(comp.expr, ce)
          instrs[wc++] = {tag: 'ASSIGN', 
                          pos: compile_time_environment_position(
                                   ce, comp.sym)}
      },
  lam:
      (comp, ce) => {
          instrs[wc++] = {tag: 'LDF', 
                          arity: comp.arity, 
                          addr: wc + 1};
          // jump over the body of the lambda expression
          const goto_instruction = {tag: 'GOTO'}
          instrs[wc++] = goto_instruction
          // extend compile-time environment
          compile(comp.body,
              compile_time_environment_extend(
                  comp.prms, ce))
          instrs[wc++] = {tag: 'LDC', val: undefined}
          instrs[wc++] = {tag: 'RESET'}
          goto_instruction.addr = wc;
      },
  seq: 
      (comp, ce) => compile_sequence(comp.stmts, ce),
  blk:
      (comp, ce) => {
          const locals = scan_for_locals(comp.body)
          instrs[wc++] = {tag: 'ENTER_SCOPE', num: locals.length}
          compile(comp.body,
                  // extend compile-time environment
              compile_time_environment_extend(
                  locals, ce))     
          instrs[wc++] = {tag: 'EXIT_SCOPE'}
      },
  let: 
      (comp, ce) => {
          compile(comp.expr, ce)
          instrs[wc++] = {tag: 'ASSIGN', 
                          pos: compile_time_environment_position(
                                   ce, comp.sym)}
      },
  const:
      (comp, ce) => {
          compile(comp.expr, ce)
          instrs[wc++] = {tag: 'ASSIGN', 
                          pos: compile_time_environment_position(
                                   ce, comp.sym)}
      },
  ret:
      (comp, ce) => {
          compile(comp.expr, ce)
          if (comp.expr.tag === 'app') {
              // tail call: turn CALL into TAILCALL
              instrs[wc - 1].tag = 'TAIL_CALL'
          } else {
              instrs[wc++] = {tag: 'RESET'}
          }
      },
  fun:
      (comp, ce) => {
          compile(
              {tag:  'const',
               sym:  comp.sym,
               expr: {tag: 'lam', 
                      prms: comp.prms, 
                      body: comp.body}},
            ce)
      }
  }

  