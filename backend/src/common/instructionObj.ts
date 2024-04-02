import { AnyLiteralObj, AnyTypeObj } from "../parser";

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

// export interface Instruction {
//   execute: (curState: ExecutionState) => ExecutionState;
// }

// References
export enum OpCode {
  NOP = 1,
  LDC, // Load value, no type checking here
  DECL, // Declare variable
  POP,
  JOF,
  GOTO,
  ENTER_SCOPE,
  EXIT_SCOPE,
  LD,
  ASSIGN,
  CALL, // Now call instr doesn't create stack space
  RESET,
  DONE,

  // Concurrent instructs, atomic, use for concurrent constructs
  TEST_AND_SET = 1000,
  CLEAR,
  GOROUTINE,
}

export type InstructionObj<T> = { tag: "INSTR"; type: T };

export type DeclareInstructionObj = InstructionObj<{
  op: OpCode.DECL;
  symbol: string;
  val: AnyTypeObj;
}>;

export function makeDeclareInstruction(
  symbol: string,
  val: AnyTypeObj
): DeclareInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.DECL, symbol: symbol, val: val } };
}

export type NopInstructionObj = InstructionObj<{ op: OpCode.NOP }>;

export function makeNopInstruction(): NopInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.NOP } };
}

export type LdcInstructionObj = InstructionObj<{
  op: OpCode.LDC;
  val: AnyLiteralObj;
}>;

export function makeLdcInstruction(val: AnyLiteralObj): LdcInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.LDC, val: val } };
}

export type PopInstructionObj = InstructionObj<{ op: OpCode.POP }>;

export function makePopInstruction(): PopInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.POP } };
}

export type JofInstructionObj = InstructionObj<{
  op: OpCode.JOF;
  addr: InstrAddr;
}>;

export function makeJOFInstruction(addr: InstrAddr): JofInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.JOF, addr: addr } };
}

export type GotoInstructionObj = InstructionObj<{
  op: OpCode.GOTO;
  addr: InstrAddr;
}>;

export function makeGOTOInstruction(addr: InstrAddr): GotoInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.GOTO, addr: addr } };
}

export type EnterScopeInstructionObj = InstructionObj<{
  op: OpCode.ENTER_SCOPE;
}>;

export function makeEnterScopeInstruction(): EnterScopeInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.ENTER_SCOPE } };
}

export type ExitScopeInstructionObj = InstructionObj<{ op: OpCode.EXIT_SCOPE }>;

export function makeExitScopeInstruction(): ExitScopeInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.EXIT_SCOPE } };
}

export type LdInstructionObj = InstructionObj<{
  op: OpCode.LD;
  symbol: string;
}>;

export function makeLdInstruction(symbol: string): LdInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.LD, symbol: symbol } };
}

export type AssignInstructionObj = InstructionObj<{ op: OpCode.ASSIGN }>;

export function makeAssignInstruction(): AssignInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.ASSIGN } };
}

export type CallInstructionObj = InstructionObj<{
  op: OpCode.CALL;
  args: number;
}>;

export function makeCallInstruction(args: number): CallInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.CALL, args: args } };
}

export type ResetInstructionObj = InstructionObj<{ op: OpCode.RESET }>;

export function makeResetInstruction(): ResetInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.RESET } };
}

export type DoneInstructionObj = InstructionObj<{ op: OpCode.DONE }>;

export function makeDoneInstruction(): DoneInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.DONE } };
}

export type TestAndSetInstructionObj = InstructionObj<{
  op: OpCode.TEST_AND_SET;
}>;

export function makeTestAndSetInstruction(): TestAndSetInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.TEST_AND_SET } };
}

export type ClearInstructionObj = InstructionObj<{ op: OpCode.CLEAR }>;

export function makeClearInstruction(): ClearInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.CLEAR } };
}

export type GoroutineInstructionObj = InstructionObj<{ op: OpCode.GOROUTINE }>;

export function makeGoroutineInstruction(): GoroutineInstructionObj {
  return { tag: "INSTR", type: { op: OpCode.GOROUTINE } };
}

export type AnyInstructionObj =
  | NopInstructionObj
  | LdcInstructionObj
  | DeclareInstructionObj
  | PopInstructionObj
  | JofInstructionObj
  | GotoInstructionObj
  | EnterScopeInstructionObj
  | ExitScopeInstructionObj
  | LdInstructionObj
  | AssignInstructionObj
  | CallInstructionObj
  | ResetInstructionObj
  | DoneInstructionObj
  | TestAndSetInstructionObj
  | ClearInstructionObj
  | GoroutineInstructionObj;
