import { ExecutionState } from "../common/state";

export interface Instruction {
  opCode: OpCode;
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
  CALL,
  TAIL_CALL,
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
