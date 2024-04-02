import {
  AnyInstructionObj,
  EnterScopeInstructionObj,
  GotoInstructionObj,
  JofInstructionObj,
  OpCode,
} from "../common/instructionObj";
import { ExecutionState } from "../common/state";
import { HeapType } from "../memory";

export function executeInstruction(
  ins: AnyInstructionObj,
  es: ExecutionState
): void {
  instructionFn[ins.type.op](ins, es);
}

function assertType<T extends AnyInstructionObj>(
  x: AnyInstructionObj
): asserts x is T {
  x as T;
}

const instructionFn: {
  [key in OpCode]: (ins: AnyInstructionObj, es: ExecutionState) => void;
} = {
  [OpCode.NOP]: (ins: AnyInstructionObj, es: ExecutionState) => {
    es.jobState.incrPC();
  },
  [OpCode.LDC]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.DECL]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.POP]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    es.jobState.getOS().pop();
    es.jobState.incrPC();
  },
  [OpCode.JOF]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    assertType<JofInstructionObj>(ins);
    let topOp = es.jobState.getOS().pop();
    if (topOp.type !== HeapType.Bool) {
      throw new Error("Expected boolean value on top of stack");
    }
    if (!topOp.data) {
      es.jobState.setPC(ins.type.addr);
    } else {
      es.jobState.incrPC();
    }
  },
  [OpCode.GOTO]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    assertType<GotoInstructionObj>(ins);
    es.jobState.setPC(ins.type.addr);
  },
  [OpCode.ENTER_SCOPE]: function (
    ins: AnyInstructionObj,
    es: ExecutionState
  ): void {
    assertType<EnterScopeInstructionObj>(ins);
    es.jobState.addFrame({});
    es.jobState.incrPC();
  },
  [OpCode.EXIT_SCOPE]: function (
    ins: AnyInstructionObj,
    es: ExecutionState
  ): void {
    es.jobState.exitFrame();
    es.jobState.incrPC();
  },
  [OpCode.LD]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.ASSIGN]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.CALL]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.RESET]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.DONE]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    es.machineState.IS_RUNNING = false;
  },
  [OpCode.TEST_AND_SET]: function (
    ins: AnyInstructionObj,
    es: ExecutionState
  ): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.CLEAR]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.GOROUTINE]: function (
    ins: AnyInstructionObj,
    es: ExecutionState
  ): void {
    throw new Error("Function not implemented.");
  },
};
