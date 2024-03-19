import { InstrAddr } from "../instruction/base";
import { HEAP_NODE_BYTE_SIZE, HEAP_NODE_SIZE_BYTES, IHeap, IMemoryAllocator, IMemoryManager } from "./heap";
import {
  GcFlag,
  HeapAddr, HeapInBytes,
  Type
} from "./node";

export class SimpleMemoryAllocator implements IMemoryAllocator {
  FREE_PTR: number = 1; // 0 is reserved for NULL
  memory: IHeap;

  constructor(memory: IHeap) {
    this.memory = memory;
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

export class MemoryManager implements IMemoryManager {
  alloc: IMemoryAllocator;

  constructor(alloc: IMemoryAllocator) {
    this.alloc = alloc;
  }

  printHeap(): string[] {
    const res = [];
    for (let i = 0; i < this.alloc.getNodeCount(); i++) {
      const addr = i.toString(16).padStart(HEAP_NODE_BYTE_SIZE.child, "0");
      const node = this.getHeapValue(HeapAddr.fromNum(i));
      res.push(`${addr} - ${node.toString()}`);
    }
    return res;
  }

  getNodeCount(): number {
    return this.alloc.getNodeCount();
  }

  getNewHeapAddress(): HeapAddr {
    return this.alloc.getNewHeapAddress();
  }

  getNewHeapAddresses(size: number): HeapAddr[] {
    return this.alloc.getNewHeapAddresses(size);
  }

  setHeapValueInBytes(addr: HeapAddr, val: number[]): void {
    return this.alloc.setHeapValueInBytes(addr, val);
  }

  getHeapValueInBytes(addr: HeapAddr): number[] {
    return this.alloc.getHeapValueInBytes(addr);
  }

  getHeapValue(addr: HeapAddr): HeapInBytes {
    const node = this.alloc.getHeapValueInBytes(addr);
    return HeapInBytes.fromBytes(node);
  }

  setHeapValue(addr: HeapAddr, val: HeapInBytes): void {
    this.alloc.setHeapValueInBytes(addr, val.toBytes());
  }

  allocBool(data: boolean): HeapAddr {
    const h = HeapInBytes.fromData({ type: Type.Bool, gcFlag: GcFlag.Unmarked, data });
    const addr = this.alloc.getNewHeapAddress();
    this.setHeapValue(addr, h);
    return addr;
  }

  allocInt(data: number): HeapAddr {
    const h = HeapInBytes.fromData({ type: Type.Int, gcFlag: GcFlag.Unmarked, data });
    const addr = this.alloc.getNewHeapAddress();
    this.setHeapValue(addr, h);
    return addr;
  }

  allocString(data: string): HeapAddr {
    const chunks = [];
    const MAX_CHUNK_SIZE_IN_BYTES = HEAP_NODE_BYTE_SIZE.data;

    for (let i = 0; i < data.length; i += MAX_CHUNK_SIZE_IN_BYTES) {
      chunks.push(data.slice(i, i + MAX_CHUNK_SIZE_IN_BYTES));
    }

    const addresses = this.alloc.getNewHeapAddresses(chunks.length);
    let prevAddr: HeapAddr = HeapAddr.NULL;
    for (let i = chunks.length - 1; i > 0; i--) {
      const h = HeapInBytes.fromData({ type: Type.String, gcFlag: GcFlag.Unmarked, data: chunks[i], child: prevAddr });
      this.setHeapValue(addresses[i], h);
      prevAddr = addresses[i];
    }

    return addresses[0];
  }

  allocLambda(pc: InstrAddr, frame: HeapAddr): HeapAddr {
    const h = HeapInBytes.fromData({ type: Type.Lambda, gcFlag: GcFlag.Unmarked, data: pc, child: frame });
    const addr = this.alloc.getNewHeapAddress();
    this.setHeapValue(addr, h);
    return addr;
  }
  
  allocValue(addr: HeapAddr, nextSymbol?: HeapAddr): HeapAddr {
    nextSymbol = nextSymbol ?? HeapAddr.NULL;
    const h = HeapInBytes.fromData({ type: Type.Value, gcFlag: GcFlag.Unmarked, child: nextSymbol, data: addr });
    const newAddr = this.alloc.getNewHeapAddress();
    this.setHeapValue(newAddr, h);
    return newAddr;
  }

  allocSymbol(identifier: string, valueAddr: HeapAddr): HeapAddr {
    const chunks = [];
    const MAX_CHUNK_SIZE_IN_BYTES = HEAP_NODE_BYTE_SIZE.data;

    for (let i = 0; i < identifier.length; i += MAX_CHUNK_SIZE_IN_BYTES) {
      chunks.push(identifier.slice(i, i + MAX_CHUNK_SIZE_IN_BYTES));
    }

    const addresses = this.alloc.getNewHeapAddresses(chunks.length);
    let prevAddr: HeapAddr = valueAddr;
    for (let i = chunks.length - 1; i > 0; i--) {
      const h = HeapInBytes.fromData({ type: Type.String, gcFlag: GcFlag.Unmarked, data: chunks[i], child: prevAddr });
      this.setHeapValue(addresses[i], h);
      prevAddr = addresses[i];
    }

    return addresses[0];
  }

  allocHeapAddr(data: HeapAddr): HeapAddr {
    const h = HeapInBytes.fromData({ type: Type.HeapAddr, gcFlag: GcFlag.Unmarked, child: data });
    const addr = this.alloc.getNewHeapAddress();
    this.setHeapValue(addr, h);
    return addr;
  }


  allocFrameAddr(enclosingFrame: HeapAddr, kvPairs: Record<string, HeapAddr>): HeapAddr {
    const linkedListOfSymbolValues = Object.keys(kvPairs).reduce((prev, key) => {
      return this.allocSymbol(key, this.allocValue(kvPairs[key], prev));
    }, HeapAddr.NULL);
  
    const h = HeapInBytes.fromData({ type: Type.FrameAddr, gcFlag: GcFlag.Unmarked, child: enclosingFrame, data: linkedListOfSymbolValues });
    const addr = this.alloc.getNewHeapAddress();
    this.setHeapValue(addr, h);
    return addr;
  }
}
