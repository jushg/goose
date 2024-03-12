import { STANDARD_TIME_SLICE } from "../common/constant";
import {
  ExecutionState,
  JobQueue,
  JobState,
  MachineState,
} from "../common/state";
import { ProgramFile } from "../compiler";
import { Instruction } from "../instruction/base";

// called whenever the machine is first run
function initialize(entryIndex: number): ExecutionState {
  // TODO: Fix this later!!
  let mainJobState: JobState = {
    OS: 0,
    PC: entryIndex,
    E: 0,
    RTS: [],
  };

  let startingMachineState: MachineState = {
    GLOBAL_ENV: 0,
    HEAP: [],
    FREE: 0,
    JOB_QUEUE: new JobQueue(),
    IS_RUNNING: true,
    TIME_SLICE: STANDARD_TIME_SLICE,
  };

  return {
    jobState: mainJobState,
    machineState: startingMachineState,
  };
}

function isBlocked(curState: ExecutionState): boolean {
  // Check if curJobState is block by another thread
  return false;
}

function isTimeout(curState: ExecutionState): boolean {
  return curState.machineState.TIME_SLICE === 0;
}

function executeStep(
  curState: ExecutionState,
  instructions: Instruction[]
): ExecutionState {
  // TODO: Check details
  if (isBlocked(curState) || isTimeout(curState)) {
    let nextJob = curState.machineState.JOB_QUEUE.dequeue();
    let curJob = curState.jobState;
    if (nextJob) {
      curState.machineState.JOB_QUEUE.enqueue(curJob);
      curState.jobState = nextJob;
      return curState;
    }
  }

  let nextPCIndx = curState.jobState.PC;
  curState.machineState.TIME_SLICE--;
  return instructions[nextPCIndx].execute(curState);
}

export function runProgram(prog: ProgramFile) {
  const startTime = Date.now();
  const maxTimeDuration = 0; // TODO: Add

  let curState = initialize(prog.entryIndex);
  let instructions = prog.instructions;

  while (curState.machineState.IS_RUNNING) {
    // infinite loop protection
    if (Date.now() - startTime > maxTimeDuration) {
      return;
      // throw new PotentialInfiniteLoopError(locationDummyNode(-1, -1, null), MAX_TIME)
    }

    curState = executeStep(curState, instructions);
  }

  // Clear up memory
  // Handle panic?
  // Handle recover?
}
