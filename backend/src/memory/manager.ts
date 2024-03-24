import { InstrAddr } from "../instruction/base";
import { HEAP_NODE_BYTE_SIZE, IAllocator, IUntypedAllocator } from "./";
import { GcFlag, HeapAddr, HeapInBytes, HeapType } from "./node";

export class MemoryManager implements IAllocator {
  alloc: IUntypedAllocator;

  constructor(alloc: IUntypedAllocator) {
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
    let prevAddr: HeapAddr = HeapAddr.NULL;
    for (let i = chunks.length - 1; i >= 0; i--) {
      const h = HeapInBytes.fromData({
        type: HeapType.String,
        gcFlag: GcFlag.Unmarked,
        data: chunks[i],
        child: prevAddr,
      });
      this.setHeapValue(addresses[i], h);
      prevAddr = addresses[i];
    }

    return addresses[0];
  }

  allocLambda(pc: InstrAddr, frame: HeapAddr): HeapAddr {
    const h = HeapInBytes.fromData({
      type: HeapType.Lambda,
      gcFlag: GcFlag.Unmarked,
      data: pc,
      child: frame,
    });
    const addr = this.alloc.getNewHeapAddress();
    this.setHeapValue(addr, h);
    return addr;
  }

  allocValue(addr: HeapAddr, next?: HeapAddr): HeapAddr {
    next = next ?? HeapAddr.NULL;
    const h = HeapInBytes.fromData({
      type: HeapType.Value,
      gcFlag: GcFlag.Unmarked,
      child: next,
      data: addr,
    });
    const newAddr = this.alloc.getNewHeapAddress();
    this.setHeapValue(newAddr, h);
    return newAddr;
  }

  allocHeapAddr(data: HeapAddr): HeapAddr {
    const h = HeapInBytes.fromData({
      type: HeapType.HeapAddr,
      gcFlag: GcFlag.Unmarked,
      child: data,
    });
    const addr = this.alloc.getNewHeapAddress();
    this.setHeapValue(addr, h);
    return addr;
  }

  allocFrame(
    enclosingFrame: HeapAddr,
    kvPairs: Record<string, HeapAddr>
  ): HeapAddr {
    const linkedListOfSymbolValues = Object.keys(kvPairs).reduce(
      (prev, key) => {
        const identifierAddr = this.allocString(key);
        const valueAddr = this.allocValue(kvPairs[key], prev);
        const keyAddr = this.allocValue(identifierAddr, valueAddr);
        return keyAddr;
      },
      HeapAddr.NULL
    );

    const h = HeapInBytes.fromData({
      type: HeapType.Frame,
      gcFlag: GcFlag.Unmarked,
      child: enclosingFrame,
      data: linkedListOfSymbolValues,
    });
    const addr = this.alloc.getNewHeapAddress();
    this.setHeapValue(addr, h);
    return addr;
  }
}
