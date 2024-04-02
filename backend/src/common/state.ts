import { Allocator } from "../memory";
import { ThreadControlObject } from "../virtual_machine/threadControl";
export const STANDARD_TIME_SLICE = 100;

export type ExecutionState = {
  machineState: MachineState;
  jobState: ThreadControlObject;
};

export type MachineState = {
  // HEAP is array containing all dynamically allocated data structures
  HEAP: Allocator;
  // job queue
  JOB_QUEUE: JobQueue;
  //global finish flag -> end program if set
  IS_RUNNING: boolean;
  // Time slice for current job
  TIME_SLICE: number;
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

  print(): void {
    console.log(this.items);
  }
}
