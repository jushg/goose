import { IMemoryManager } from "../memory/heap";

export type ExecutionState = {
  machineState: MachineState;
  jobState: JobState;
};

export type JobState = {
  // OS: any[],
  // The OS index inside the HEAP
  OS: number;
  // Current PC index of the Job
  PC: number;
  // Index in HEAP of the job ENV
  E: number;
  RTS: any[];
};

export type MachineState = {
  // GLOBAL_ENV is the env that contains all the primitive functions
  GLOBAL_ENV: number;
  // HEAP is array containing all dynamically allocated data structures
  HEAP: IMemoryManager;
  // next free slot in heap
  FREE: number;
  // job queue
  JOB_QUEUE: JobQueue;
  //global finish flag -> end program if set
  IS_RUNNING: boolean;
  // Time slice for current job
  TIME_SLICE: number;
};

export class JobQueue {
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
