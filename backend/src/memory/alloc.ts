import { HEAP_NODE_BYTE_SIZE, HEAP_NODE_SIZE_BYTES, IHeap, IUntypedAllocator, validateHeap } from "./";
import {
  HeapAddr
} from "./node";

export class SimpleMemoryAllocator implements IUntypedAllocator {
  FREE_PTR: number = 1; // 0 is reserved for NULL
  memory: IHeap;

  constructor(memory: IHeap) {
    this.memory = memory;
    validateHeap(memory);
  }

  getNewHeapAddress(): HeapAddr {
    const ptr = this.FREE_PTR;
    this.FREE_PTR++;
    this.checkIfFull();
    return HeapAddr.fromNum(ptr);
  }

  getNewHeapAddresses(size: number): HeapAddr[] {
    const ptr = this.FREE_PTR;
    this.FREE_PTR += size;
    this.checkIfFull();
    return Array(size).map((_, i) => HeapAddr.fromNum(ptr + i));
  }

  setHeapValueInBytes(addr: HeapAddr, val: number[]): void {
    const node = this.getHeapNode(addr);
    node.set(val);
  }
  
  getHeapValueInBytes(addr: HeapAddr): number[] {
    const node = this.getHeapNode(addr);
    return Array.from(node);
  }

  printHeap(): string[] {
    const res = [];
    for (let i = 0; i < this.FREE_PTR; i++) {
      const node = this.getHeapNode(HeapAddr.fromNum(i));
      res.push(`H: ${i.toString(16).padStart(HEAP_NODE_BYTE_SIZE.child, "0")} ${Array.from(node).map((n) => n.toString(16).padStart(2, "0")).join(" ")}`);
    }
    return res;
  }

  getNodeCount(): number {
    return this.memory.nodeCount;
  }

  private checkIfFull(): void {
    // TODO: for now, this alloc performs no GC, just fails if heap is full.
    if (this.FREE_PTR >= this.memory.nodeCount) {
      throw new Error("Heap overflow");
    }
  }

  private getHeapNode(addr: HeapAddr): Uint8Array {
    return new Uint8Array(
      this.memory.buf,
      addr.addr * HEAP_NODE_SIZE_BYTES,
      HEAP_NODE_SIZE_BYTES
    );
  }
}
