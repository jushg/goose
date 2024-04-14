import { GoslingMemoryManager } from "../virtual_machine/memory";
import { ThreadControlObject } from "../virtual_machine/threadControl";
import { CompiledFile } from "./compiledFile";
export const STANDARD_TIME_SLICE = 100;

export type ExecutionState = {
  mainThreadId: string;
  program: CompiledFile;
  machineState: MachineState;
  jobState: ThreadControlObject;
  vmPrinter: (
    ctx: { threadId: string } | { component: string },
    s: string
  ) => void;
  gcTriggerMemoryUsageThreshold: number;
};

export type MachineState = {
  // HEAP is array containing all dynamically allocated data structures
  HEAP: GoslingMemoryManager;
  // job queue
  JOB_QUEUE: JobQueue;
  //global finish flag -> end program if set
  IS_RUNNING: boolean;
  // Time slice for current job
  TIME_SLICE: number;
  MAIN_ID: string;
};

export class JobQueue {
  private items: ThreadControlObject[];

  constructor() {
    this.items = [];
  }

  enqueue(item: ThreadControlObject): void {
    this.items.push(item);
  }

  dequeue(): ThreadControlObject | undefined {
    return this.items.shift();
  }

  peek(): ThreadControlObject | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  print(): string {
    return "JOBS: [" + this.items.map((item) => item.getId()).join(", ") + "]";
  }
}
