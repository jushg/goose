export { Instruction } from "./base";
import { ExecutionState } from "../common/state";
import { Instruction } from "./base";

export class DoneInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    curState.machineState.IS_RUNNING = false
    return curState
  }
}

export class DeclareInstruction implements Instruction {
  symbol: string
  type: any
  isConst: boolean
  constructor(symbol: string, type: any, isConst: boolean = false) {
    this.symbol = symbol
    this.type = type,
    this.isConst = isConst
  }
  execute(curState: ExecutionState): ExecutionState {
    // Assign memory location to variable
    // Assign default value
    return curState
  }
}

export class NopInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
      curState.jobState.PC++
      return curState
  }
}

export class MarkInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
      curState.jobState.PC++
      return curState
  }
}

export class GotoInstruction implements Instruction {
  newPC: number

  constructor(newPC: number) {
    this.newPC = newPC
  }

  execute(curState: ExecutionState): ExecutionState {
    curState.jobState.PC = this.newPC
    return curState
  }
}


// These need memory API
export class PopInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
      // Current state -> pop -> use pop OS in heap function
      curState.jobState.PC++
      return curState;
  }
}

export class ResetInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details
    return curState
  }
}

export class AssignInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    curState.jobState.PC++
    return curState
  }
}

export class JofInstruction implements Instruction {
  newPC: number

  constructor(newPC: number) {
      this.newPC = newPC
  }

  execute(curState: ExecutionState): ExecutionState {
    // TODO: pop from OS
    let res = false
    if(!res) {
      curState.jobState.PC = this.newPC
    } else {
      curState.jobState.PC++
    }
    return curState
  }
}


export class EnterScopeInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    curState.jobState.PC++
    return curState
  }
}

export class ExitScopeInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    curState.jobState.PC++
    return curState
  }
}

export class LdcInstruction implements Instruction {
  value: any // Fix this

  constructor(value: any) {
    this.value = value
  }

  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    curState.jobState.PC++
    return curState
  }
}


export class LdInstruction implements Instruction {
  symbol: string

  constructor(symbol: string) {
    this.symbol = symbol
  }
    execute(curState: ExecutionState): ExecutionState {
      // TODO: Add details

      curState.jobState.PC++
      return curState
    }
}

export class CallInstruction implements Instruction {
  numParam: number

  constructor(numParam: number) {
    this.numParam = numParam
  }
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    // For call, we expect enter scope to be call first, we don't create new stack frame

    curState.jobState.PC++
    return curState
  }
}

export class TestAndSetInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    curState.jobState.PC++
    return curState
  }
}

export class GoroutineInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    curState.jobState.PC++
    return curState
  }
}

export class ClearInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details, I kinda forgot what this does

    curState.jobState.PC++
    return curState
  }
}

export class ExitFunctionInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    return curState
  }
}







