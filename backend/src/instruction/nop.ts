import { ExecutionState } from "../common/state";
import { Instruction, OpCode } from "./base";

export class NopInstruction implements Instruction {
  opCode: OpCode = OpCode.NOP;
  execute(curState: ExecutionState): ExecutionState {
    curState.jobState.PC = curState.jobState.PC + 1;
    return curState;
  }
}
