import { ExecutionState } from "../common/state";

export class InstrAddr {
  addr: number;

  constructor(addr: number) {
    this.addr = addr;
  }
  
  static fromNum(addr: number): InstrAddr {
    return new InstrAddr(addr);
  }

  toString(): string {
    return `PC: ${this.addr}`;
  }
}

export interface Instruction {
  execute: (curState: ExecutionState) => ExecutionState;
}

export enum OpCode {
  NOP = 1,
  LDC, // Load value, no type checking here
  POP,
  JOF,
  GOTO,
  ENTER_SCOPE,
  EXIT_SCOPE,
  LD,
  ASSIGN,
  LDF,
  CALL, // Now call instr doesn't create stack space
  RESET,
  DONE,

  // Concurrent instructs, atomic, use for concurrent constructs
  TEST_AND_SET = 1000,
  CLEAR,
  GOROUTINE,
}

`c <- 1`;

`
c = { mutex, value }
c.val = 1
WHILE ( TEST_AND_SET (c.lock, initial: EMPTY, new: EMPTY) )
`;

`x := <-c`;

`
c.val = 1
WHILE ( TEST_AND_SET (c.lock, initial: EMPTY, new: EMPTY) )
`;
