import { AnyLiteralObj, AnyTypeObj } from "../parser";
import { SpecialFrameLabels } from "../virtual_machine/memory";

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

// References
export enum OpCode {
  NOP = "NOP",
  LDC = "LDC", // Load value, no type checking here
  DECL = "DECL", // Declare variable
  POP = "POP",
  JOF = "JOF",
  GOTO = "GOTO",
  ENTER_SCOPE = "ENTER_SCOPE",
  EXIT_SCOPE = "EXIT_SCOPE",
  LD = "LD",
  ASSIGN = "ASSIGN",
  CALL = "CALL", // Now call instr doesn't create stack space
  RESET = "RESET",
  DONE = "DONE",

  // Concurrent instructs, atomic, use for concurrent constructs
  TEST_AND_SET = "TEST_AND_SET",
  CLEAR = "CLEAR",
  GOROUTINE = "GOROUTINE",

  SYS_CALL = "SYS_CALL",
}

export type InstructionObj<T extends OpCode, Data = {}> = {
  tag: "INSTR";
  op: T;
} & Data;

export type DeclareInstructionObj = InstructionObj<
  OpCode.DECL,
  { symbol: string; val: AnyTypeObj }
>;

export function makeDeclareInstruction(
  symbol: string,
  val: AnyTypeObj
): DeclareInstructionObj {
  return { tag: "INSTR", op: OpCode.DECL, symbol: symbol, val: val };
}

export type NopInstructionObj = InstructionObj<OpCode.NOP>;

export function makeNopInstruction(): NopInstructionObj {
  return { tag: "INSTR", op: OpCode.NOP };
}

export type LdcInstructionObj = InstructionObj<
  OpCode.LDC,
  { val: AnyLiteralObj }
>;

export function makeLdcInstruction(val: AnyLiteralObj): LdcInstructionObj {
  return { tag: "INSTR", op: OpCode.LDC, val: val };
}

export type PopInstructionObj = InstructionObj<OpCode.POP>;

export function makePopInstruction(): PopInstructionObj {
  return { tag: "INSTR", op: OpCode.POP };
}

export type JofInstructionObj = InstructionObj<OpCode.JOF, { addr: InstrAddr }>;

export function makeJOFInstruction(addr: InstrAddr): JofInstructionObj {
  return { tag: "INSTR", op: OpCode.JOF, addr: addr };
}

export type GotoInstructionObj = InstructionObj<
  OpCode.GOTO,
  { addr: InstrAddr }
>;

export function makeGOTOInstruction(addr: InstrAddr): GotoInstructionObj {
  return { tag: "INSTR", op: OpCode.GOTO, addr: addr };
}

export type EnterScopeInstructionObj = InstructionObj<
  OpCode.ENTER_SCOPE,
  { scopeDecls: [string, AnyTypeObj][]; label?: "FOR" }
>;

export function makeEnterScopeInstruction(
  scopeDecls: [string, AnyTypeObj][],
  label?: "FOR"
): EnterScopeInstructionObj {
  return {
    tag: "INSTR",
    op: OpCode.ENTER_SCOPE,
    scopeDecls: scopeDecls,
    label: label,
  };
}

export type ExitScopeInstructionObj = InstructionObj<
  OpCode.EXIT_SCOPE,
  { label?: SpecialFrameLabels }
>;

export function makeExitScopeInstruction(
  label?: SpecialFrameLabels
): ExitScopeInstructionObj {
  return { tag: "INSTR", op: OpCode.EXIT_SCOPE, label: label };
}

export type LdInstructionObj = InstructionObj<
  OpCode.LD,
  {
    symbol: string;
  }
>;

export function makeLdInstruction(symbol: string): LdInstructionObj {
  return { tag: "INSTR", op: OpCode.LD, symbol: symbol };
}

export type AssignInstructionObj = InstructionObj<OpCode.ASSIGN>;

export function makeAssignInstruction(): AssignInstructionObj {
  return { tag: "INSTR", op: OpCode.ASSIGN };
}

export type CallInstructionObj = InstructionObj<OpCode.CALL, { args: number }>;

export function makeCallInstruction(args: number): CallInstructionObj {
  return { tag: "INSTR", op: OpCode.CALL, args: args };
}

export type ResetInstructionObj = InstructionObj<OpCode.RESET>;

export function makeResetInstruction(): ResetInstructionObj {
  return { tag: "INSTR", op: OpCode.RESET };
}

export type DoneInstructionObj = InstructionObj<OpCode.DONE>;

export function makeDoneInstruction(): DoneInstructionObj {
  return { tag: "INSTR", op: OpCode.DONE };
}

export type TestAndSetInstructionObj = InstructionObj<OpCode.TEST_AND_SET>;

export function makeTestAndSetInstruction(): TestAndSetInstructionObj {
  return { tag: "INSTR", op: OpCode.TEST_AND_SET };
}

export type ClearInstructionObj = InstructionObj<OpCode.CLEAR>;

export function makeClearInstruction(): ClearInstructionObj {
  return { tag: "INSTR", op: OpCode.CLEAR };
}

export type GoroutineInstructionObj = InstructionObj<OpCode.GOROUTINE>;

export function makeGoroutineInstruction(): GoroutineInstructionObj {
  return { tag: "INSTR", op: OpCode.GOROUTINE };
}

export type SysCallInstructionObj = InstructionObj<
  OpCode.SYS_CALL,
  {
    sym:
      | "make"
      | "done"
      | "printOS"
      | "printHeap"
      | "triggerBreakpoint"
      | "makeLambda"
      | "new";
    type: AnyTypeObj | null;
    argCount: number;
  }
>;
export function makeSysCallInstruction(
  sym: SysCallInstructionObj["sym"],
  type: AnyTypeObj | null,
  argCount: number
): SysCallInstructionObj {
  return { tag: "INSTR", op: OpCode.SYS_CALL, sym, type, argCount };
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
  | GoroutineInstructionObj
  | SysCallInstructionObj;

export function isOpType<T extends OpCode>(
  val: T,
  obj: AnyInstructionObj
): obj is Extract<AnyInstructionObj, { op: T }> {
  return obj.op === val;
}

export function assertOpType<T extends OpCode>(
  val: T,
  obj: AnyInstructionObj
): asserts obj is Extract<AnyInstructionObj, { op: T }> {
  if (!isOpType(val, obj)) {
    throw new Error(`Expected Instruction type ${val}, got ${obj.op}`);
  }
}
