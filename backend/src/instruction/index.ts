export { Instruction } from "./base";
import { ExecutionState } from "../common/state";
import { HeapType } from "../memory";
import { InstrAddr, Instruction } from "./base";

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
    const placeHolder = { type: HeapType.Int, data: 1 } as const;
    curState.jobState.getRTS().assign(this.symbol, placeHolder);
    curState.jobState.incrPC()
    return curState
  }
}

export class NopInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
      curState.jobState.incrPC()
      return curState
  }
}

export class MarkInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
      curState.jobState.incrPC()
      return curState
  }
}

export class GotoInstruction implements Instruction {
  newPC: InstrAddr

  constructor(newPC: number) {
    this.newPC = new InstrAddr(newPC)
  }

  execute(curState: ExecutionState): ExecutionState {
    curState.jobState.setPC(this.newPC)
    return curState
  }
}


// These need memory API
export class PopInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
      // Current state -> pop -> use pop OS in heap function
      curState.jobState.getOS().pop()

      curState.jobState.incrPC()

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

    curState.jobState.incrPC()
    return curState
  }
}

export class JofInstruction implements Instruction {
  newPC: InstrAddr

  constructor(newPC: number) {
      this.newPC = new InstrAddr(newPC)
  }

  execute(curState: ExecutionState): ExecutionState {
    // TODO: fix this code
    let litBoolean = curState.jobState.getOS().pop()
    if(litBoolean.type == HeapType.Bool) {
      let res = litBoolean.data
      if(!res) {
        curState.jobState.setPC(this.newPC)
      } else {
        curState.jobState.incrPC()
      }
    }
   
    return curState
  }
}


export class EnterScopeInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    curState.jobState.addFrame({})
    curState.jobState.incrPC()
    return curState
  }
}

export class ExitScopeInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    curState.jobState.exitFrame()
    curState.jobState.incrPC()
    return curState
  }
}

export class LdcInstruction implements Instruction {
  value: any // Fix this to correct type

  constructor(value: any) {
    this.value = value
  }

  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    curState.jobState.incrPC()
    return curState
  }
}


export class LdInstruction implements Instruction {
  symbol: string

  constructor(symbol: string) {
    this.symbol = symbol
  }
    execute(curState: ExecutionState): ExecutionState {
      const scope = curState.jobState.getRTS();
      const x = scope.lookup(this.symbol)!;
      curState.jobState.getOS().push(x)
      curState.jobState.incrPC()
      return curState
    }
}

export class CallInstruction implements Instruction {
  numParam: number

  constructor(numParam: number) {
    this.numParam = numParam
  }
  execute(curState: ExecutionState): ExecutionState {


    curState.jobState.incrPC()
    return curState
  }
}

export class ExitFunctionInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    curState.jobState.exitSpecialFrame('CALL')
    return curState
  }
}


// Concurrent constructs

export class TestAndSetInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    curState.jobState.incrPC()
    return curState
  }
}

export class GoroutineInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details

    curState.jobState.incrPC()
    return curState
  }
}

export class ClearInstruction implements Instruction {
  execute(curState: ExecutionState): ExecutionState {
    // TODO: Add details, I kinda forgot what this does

    curState.jobState.incrPC()
    return curState
  }
}








