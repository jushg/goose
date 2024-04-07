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
  log: (s: string) => void = console.log
): ExecutionState {
  let memory = createGoslingMemoryManager(memorySize);
  let vmPrinter = (ctx: { threadId: string } | "VM", s: string) => {
    if (ctx === "VM") log(s);
    else log(`Thread ${ctx.threadId}: ${s}`);
  };
  let mainJobState = createThreadControlObject(memory, vmPrinter);

  const startingMachineState: MachineState = {
    HEAP: memory,
    JOB_QUEUE: new JobQueue(),
    IS_RUNNING: true,
    TIME_SLICE: STANDARD_TIME_SLICE,
  };

  return {
    jobState: mainJobState,
    machineState: startingMachineState,
    vmPrinter,
    program,
  };
}

function cannotExecute(curState: ExecutionState): boolean {
  // Check if curJobState is block by another thread
  return curState.jobState.getStatus() !== "RUNNABLE";
}

function isTimeout(curState: ExecutionState): boolean {
  return curState.machineState.TIME_SLICE === 0;
}

function needMemoryCleanup(curState: ExecutionState): boolean {
  return (
    curState.machineState.HEAP.getMemoryUsed() >
    PERCENT_TO_TRIGGER_GC * curState.machineState.HEAP.getMemorySize()
  );
}

export function executeStep(curState: ExecutionState) {
  const instructions: Array<AnyInstructionObj> = curState.program.instructions;
  if (cannotExecute(curState) || isTimeout(curState)) {
    let nextJob = curState.machineState.JOB_QUEUE.dequeue();
    let curJob = curState.jobState;
    if (nextJob) {
      curState.machineState.JOB_QUEUE.enqueue(curJob);
      curState.jobState = nextJob;
      return curState;
    }
  }

  if (needMemoryCleanup(curState)) {
    curState.machineState.HEAP.runGarbageCollection();
  }

  let nextPCIndx = curState.jobState.getPC().addr;
  curState.machineState.TIME_SLICE--;
  executeInstruction(instructions[nextPCIndx], curState);
  return curState;
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

    curState = executeStep(curState);
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
