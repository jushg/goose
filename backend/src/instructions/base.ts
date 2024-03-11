import { ExecutionState } from "../common/state"

export interface Instruction {
    opCode: OpCode
    execute: (curState: ExecutionState) => ExecutionState
}

export enum OpCode {
    NOP = 0,
    LDC = 1, // Load value, no type checking here
    UNOP = 2,
    BINOP = 3,
    Pop = 4,
    JOF = 5,
    GOTO = 6,
    ENTER_SCOPE = 7,
    EXIT_SCOPE = 8,
    LD = 9,
    ASSIGN = 10,
    LDF = 11,
    CALL = 12,
    TAIL_CALL = 13,
    RESET = 14,
    DONE = 15,

    // Concurrent instructs, atomic, use for concurrent constructs
    TEST_AND_SET = 1000,
    CLEAR = 1001,
}
