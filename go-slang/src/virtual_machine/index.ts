import { CompiledFile } from "../common/compiledFile";
import { AnyInstructionObj, InstrAddr } from "../common/instructionObj";
import {
  ExecutionState,
  JobQueue,
  MachineState,
  STANDARD_TIME_SLICE,
} from "../common/state";
import { HeapAddr, HeapType } from "../memory";
import { executeInstruction } from "./instructionLogic";
import { createGoslingMemoryManager } from "./memory";
import { GoslingScopeObj } from "./scope";
import { createThreadControlObject } from "./threadControl";

const PERCENT_TO_TRIGGER_GC = 0.7;

export function initializeVirtualMachine(
  program: CompiledFile,
  memorySize: number = (2 ** 8) ** 2,
  vmPrinter: (
    ctx: { threadId: string } | { component: string },
    s: string
  ) => void = console.dir,
  gcTriggerMemoryUsageThreshold = PERCENT_TO_TRIGGER_GC
): ExecutionState {
  let memory = createGoslingMemoryManager(memorySize);
  let mainJobState = createThreadControlObject(memory, vmPrinter);

  const startingMachineState: MachineState = {
    HEAP: memory,
    JOB_QUEUE: new JobQueue(),
    IS_RUNNING: true,
    TIME_SLICE: STANDARD_TIME_SLICE,
    MAIN_ID: mainJobState.getId(),
  };

  return {
    mainThreadId: mainJobState.getId(),
    jobState: mainJobState,
    machineState: startingMachineState,
    gcTriggerMemoryUsageThreshold,
    vmPrinter,
    program,
  };
}

function needMemoryCleanup(currState: ExecutionState): boolean {
  return (
    currState.machineState.HEAP.getMemoryAllocated() >
    currState.gcTriggerMemoryUsageThreshold *
      currState.machineState.HEAP.getMemorySize()
  );
}

export function executeStep(currState: ExecutionState) {
  const instructions: Array<AnyInstructionObj> = currState.program.instructions;
  const { jobState: currJob, machineState } = currState;
  if (needMemoryCleanup(currState)) {
    const memUsage = currState.machineState.HEAP.getMemoryAllocated();
    machineState.HEAP.runGarbageCollection();
    const newMemUsage = currState.machineState.HEAP.getMemoryAllocated();
    currState.vmPrinter(
      { component: "GC" },
      `Compressed ${100 - Math.floor((newMemUsage / memUsage) * 100)}% -> ${memUsage} -> ${newMemUsage}`
    );
  }

  let nextPCIndx = currJob.getPC().addr;
  machineState.TIME_SLICE--;
  executeInstruction(instructions[nextPCIndx], currState);

  if (machineState.TIME_SLICE === 0) {
    if (currJob.getStatus() === "RUNNABLE")
      currJob.setStatus("TIME_SLICE_EXCEEDED");
    machineState.TIME_SLICE = STANDARD_TIME_SLICE;
  }

  if (currJob.getStatus() === "RUNNABLE") return currState;

  if (currJob.getStatus() === "TIME_SLICE_EXCEEDED")
    currJob.setStatus("RUNNABLE");
  if (currJob.getStatus() !== "DONE") machineState.JOB_QUEUE.enqueue(currJob);

  let nextJob = machineState.JOB_QUEUE.dequeue();
  if (nextJob) {
    currState.jobState = nextJob;
    return currState;
  } else {
    return null;
  }
}

export function runProgram(prog: CompiledFile) {
  const startTime = Date.now();
  const maxTimeDuration = /* 10 seconds */ 1000 * 10;

  let curState = initializeVirtualMachine(prog);

  while (curState.machineState.IS_RUNNING) {
    // infinite loop protection
    if (Date.now() - startTime > maxTimeDuration) {
      throw new Error("Infinite loop detected");
      return;
      // throw new PotentialInfiniteLoopError(locationDummyNode(-1, -1, null), MAX_TIME)
    }

    const newState = executeStep(curState);
    if (newState === null) break;
    curState = newState;
  }

  // Clear up memory
  // Handle panic?
  // Handle recover?
}
export function isGoslingType<T extends HeapType>(
  val: T,
  obj: AnyGoslingObject | null
): obj is GoslingObject<T> {
  return obj !== null && obj.type === val;
}
export function assertGoslingType<T extends HeapType>(
  val: T,
  obj: AnyGoslingObject | null
): asserts obj is GoslingObject<T> {
  if (obj === null)
    throw new Error(`Expected GoslingObj type ${val}, got null`);
  if (!isGoslingType(val, obj))
    throw new Error(`Expected GoslingObj type ${val}, got ${obj.type}`);
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

  getLambda(lambdaPtr: GoslingBinaryPtrObj): GoslingLambdaObj;
  allocLambda(closureAddr: HeapAddr, pcAddr: InstrAddr): HeapAddr;
  getEnvs(addr: HeapAddr): GoslingScopeObj;
};
