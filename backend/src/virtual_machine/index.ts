import { STANDARD_TIME_SLICE } from "../common/constant";
import {
  ExecutionState,
  JobQueue,
  JobState,
  MachineState,
} from "../common/state";
import { ProgramFile } from "../compiler";
import { InstrAddr, Instruction } from "../instruction/base";
import { HeapAddr, HeapType, createHeapManager } from "../memory";
import { GoslingScopeObj } from "./scope";

// called whenever the machine is first run
function initialize(entryIndex: number): ExecutionState {
  // TODO: Fix this later!!
  const mainJobState: JobState = {
    OS: 0,
    PC: entryIndex,
    E: 0,
    RTS: [],
  };

  const startingMachineState: MachineState = {
    GLOBAL_ENV: 0,
    HEAP: createHeapManager(/* nodeCount = */ 2 ** 8),
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
export function isGoslingType<T extends HeapType>(
  val: T,
  obj: AnyGoslingObject
): obj is GoslingObject<T> {
  return obj.type === val;
}
export function assertGoslingType<T extends HeapType>(
  val: T,
  obj: AnyGoslingObject
): asserts obj is GoslingObject<T> {
  if (!isGoslingType(val, obj)) {
    throw new Error(`Expected GoslingObj type ${val}, got ${obj.type}`);
  }
}
export type AnyGoslingObject =
  | GoslingBinaryPtrObj
  | GoslingBoolObj
  | GoslingIntObj
  | GoslingStringObj;

export type Literal<T extends AnyGoslingObject> = T extends T
  ? Omit<T, "addr">
  : never;

export type GoslingObject<T extends HeapType> = Extract<
  AnyGoslingObject,
  { type: T }
>;

export type GoslingBoolObj = {
  addr: HeapAddr;
  type: HeapType.Bool;
  data: boolean;
};
export type GoslingIntObj = {
  addr: HeapAddr;
  type: HeapType.Int;
  data: number;
};
export type GoslingStringObj = {
  addr: HeapAddr;
  type: HeapType.String;
  data: string;
};
export type GoslingBinaryPtrObj = {
  addr: HeapAddr;
  type: HeapType.BinaryPtr;
  child1: HeapAddr;
  child2: HeapAddr;
};

export type GoslingLambdaObj = {
  closure: GoslingScopeObj;
  pcAddr: InstrAddr;
};

export type GoslingListObj = {
  nodeAddr: HeapAddr;
  node: AnyGoslingObject;
  value: AnyGoslingObject | null;
}[];

export type IGoslingMemoryManager = {
  get(addr: HeapAddr): AnyGoslingObject | null;
  set(addr: HeapAddr, val: Literal<AnyGoslingObject>): void;
  clear(addr: HeapAddr): void;
  alloc(data: Literal<AnyGoslingObject>): AnyGoslingObject;

  getLambda(addr: HeapAddr): GoslingLambdaObj;
  allocLambda(closureAddr: HeapAddr, pcAddr: InstrAddr): HeapAddr;
  getEnvs(addr: HeapAddr): GoslingScopeObj;
};
