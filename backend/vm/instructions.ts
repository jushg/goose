

export type ProgramFile = {
    entryIndex: number,
    instructions: Instruction[]
}

  
export type ExecutionState = {
    machineState: MachineState
    jobState: JobState
}

export type JobState = {
    // OS: any[],
    // The OS index inside the HEAP
    OS:number
    // Current PC index of the Job
    PC: number
    // Index in HEAP of the job ENV
    E: number
    RTS: any[]
}

export type MachineState = {
    // GLOBAL_ENV is the env that contains all the primitive functions
    GLOBAL_ENV: number
    // HEAP is array containing all dynamically allocated data structures
    HEAP: HeapNode[]
    // next free slot in heap
    FREE: number
    // job queue
    JOB_QUEUE: JobQueue
    //global finish flag -> end program if set
    IS_RUNNING: boolean
}

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

// called whenever the machine is first run
function initialize(entryIndex: number): ExecutionState {
    // TODO: Fix this later!!
    let mainJobState: JobState = {
        OS: 0,
        PC: entryIndex, 
        E: 0, 
        RTS:[]
    }

    let startingMachineState: MachineState = {
        GLOBAL_ENV: 0,
        HEAP: [],
        FREE: 0,
        JOB_QUEUE: new JobQueue,
        IS_RUNNING: true
    }

    return {
        jobState: mainJobState,
        machineState: startingMachineState
    }

}

function executeStep(curState: ExecutionState, instructions: Instruction[]): ExecutionState {
    // TODO: Check details
    let nextPCIndx = curState.jobState.PC
    return instructions[nextPCIndx].execute(curState)
}

function runProgram(prog: ProgramFile) {
    const startTime = Date.now()
    const maxTimeDuration = 0 // TODO: Add

    let curState = initialize(prog.entryIndex)
    let instructions = prog.instructions

    while (curState.machineState.IS_RUNNING) {
        // infinite loop protection
        if (Date.now() - startTime > maxTimeDuration) {
            return;
            // throw new PotentialInfiniteLoopError(locationDummyNode(-1, -1, null), MAX_TIME)
        }

        curState = executeStep(curState, instructions)
    }
    // Clear up memory 
    // Handle panic
    // Handle recover
}


export type HeapNode = {
    // Todo: fill in this
}


class JobQueue {
    private items: JobState[];
  
    constructor() {
      this.items = [];
    }
  
    enqueue(item: JobState): void {
      this.items.push(item);
    }
  
    dequeue(): JobState | undefined {
      return this.items.shift();
    }
  
    peek(): JobState | undefined {
      return this.items[0];
    }
  
    isEmpty(): boolean {
      return this.items.length === 0;
    }
  
    size(): number {
      return this.items.length;
    }
  
    print(): void {
      console.log(this.items);
    }
}
