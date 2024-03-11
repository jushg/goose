import { ExecutionState } from "../common/state"
import { Instruction, OpCode } from "./base"

export class DoneInstruction implements Instruction {
    opCode: OpCode = OpCode.DONE
    execute(curState: ExecutionState): ExecutionState {
        curState.machineState.IS_RUNNING = false
        return curState
    }
}