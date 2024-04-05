import {
  HEAP_NODE_BYTE_SIZE,
  HEAP_NODE_BYTE_TOTAL_SIZE,
  IHeap,
  IUntypedAllocator,
  validateHeap,
} from ".";
import { HeapAddr } from "./node";

export class SimpleMemoryAllocator implements IUntypedAllocator {
  FREE_PTR: number = 1; // 0 is reserved for NULL
  _memory: IHeap;

  constructor(memory: IHeap) {
    this._memory = memory;
    validateHeap(this._memory);
  }

  getNewHeapAddress(): HeapAddr {
    const ptr = this.FREE_PTR;
    this.FREE_PTR++;
    this.checkIfFull();
    return HeapAddr.fromNum(ptr);
  }

  getNewHeapAddresses(size: number): HeapAddr[] {
    const ptr = this.FREE_PTR;
    const arr = [];

    for (let i = 0; i < size; i++) {
      arr.push(HeapAddr.fromNum(ptr + i));
    }

    this.FREE_PTR += size;
    this.checkIfFull();
    return arr;
  }

  setHeapValueInBytes(addr: HeapAddr, val: number[]): void {
    if (addr._a === "0x4a")
      console.dir({
        addr: addr._a,
        foo: "set",
        counter: counter++,
        val: JSON.stringify(val),
        prior: JSON.stringify(this._memory.buf.at(addr.toNum())),
        now: Date.now(),
      });

    if (val.length !== HEAP_NODE_BYTE_TOTAL_SIZE)
      throw new Error(
        `Invalid value size: ${val.length} !== ${HEAP_NODE_BYTE_TOTAL_SIZE}`
      );

    for (let i = 0; i < HEAP_NODE_BYTE_TOTAL_SIZE; i++) {
      this._memory.buf[addr.toNum()][i] = val[i];
    }
  }

  getHeapValueInBytes(addr: HeapAddr): number[] {
    if (addr._a === "0x4a")
      console.dir({
        addr: addr._a,
        foo: "get",
        counter: counter++,
        prior: JSON.stringify(this._memory.buf.at(addr.toNum())),
        now: Date.now(),
      });
    const res = this._memory.buf.at(addr.toNum())!;
    return [...res];
  }

  printHeap(): string[] {
    const res = [];
    for (let i = 1; i < this.FREE_PTR; i++) {
      const node = this.getHeapValueInBytes(HeapAddr.fromNum(i));
      res.push(
        `H: ${i.toString(16).padStart(HEAP_NODE_BYTE_SIZE.child, "0")} ${Array.from(
          node
        )
          .map((n) => n.toString(16).padStart(2, "0"))
          .join(" ")}`
      );
    }
    return res;
  }

  getNodeCount(): number {
    return this._memory.nodeCount;
  }

  private checkIfFull(): void {
    // TODO: for now, this alloc performs no GC, just fails if heap is full.
    if (this.FREE_PTR >= this._memory.nodeCount) {
      throw new Error("Heap overflow");
    }
  }
}

let counter = 0;
