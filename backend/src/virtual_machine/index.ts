import { ExecutionState, MachineState, JobState, JobQueue } from "../common/state"
import { Instruction } from "../instructions/base"
import { ProgramFile } from "../compiler"

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

export function runProgram(prog: ProgramFile) {
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
    // Handle panic?
    // Handle recover?
}






