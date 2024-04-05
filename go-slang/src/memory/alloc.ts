import { HEAP_NODE_BYTE_SIZE, IUntypedAllocator } from ".";
import { GcFlag, HeapAddr, HeapInBytes, HeapType } from "./node";

export class Allocator {
  alloc: IUntypedAllocator;

  constructor(alloc: IUntypedAllocator) {
    this.alloc = alloc;
  }

  printHeap(): string[] {
    const res = [];
    for (let i = 1; i < this.alloc.getNodeCount(); i++) {
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

  getHeapValue(addr: HeapAddr): HeapInBytes {
    const node = this.alloc.getHeapValueInBytes(addr);
    return HeapInBytes.fromBytes(node);
  }

  setHeapValue(addr: HeapAddr, val: HeapInBytes): void {
    this.alloc.setHeapValueInBytes(addr, val.toBytes());
  }

  allocBool(data: boolean): HeapAddr {
    const h = HeapInBytes.fromData({
      type: HeapType.Bool,
      gcFlag: GcFlag.Unmarked,
      data,
    });
    const addr = this.alloc.getNewHeapAddress();
    this.setHeapValue(addr, h);
    return addr;
  }

  allocInt(data: number): HeapAddr {
    const h = HeapInBytes.fromData({
      type: HeapType.Int,
      gcFlag: GcFlag.Unmarked,
      data,
    });
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

    if (chunks.length === 0) {
      chunks.push("");
    }

    const addresses = this.alloc.getNewHeapAddresses(chunks.length);
    let prevAddr: HeapAddr = HeapAddr.getNull();
    for (let i = chunks.length - 1; i >= 0; i--) {
      const h = HeapInBytes.fromData({
        type: HeapType.String,
        gcFlag: GcFlag.Unmarked,
        data: chunks[i],
        next: prevAddr,
      });
      this.setHeapValue(addresses[i], h);
      prevAddr = addresses[i];
    }

    return addresses[0];
  }

  allocBinaryPtr(child1: HeapAddr, child2?: HeapAddr): HeapAddr {
    child2 = child2 ?? HeapAddr.getNull();
    const h = HeapInBytes.fromData({
      type: HeapType.BinaryPtr,
      gcFlag: GcFlag.Unmarked,
      child1,
      child2,
    });
    const newAddr = this.alloc.getNewHeapAddress();
    this.setHeapValue(newAddr, h);
    return newAddr;
  }
}
