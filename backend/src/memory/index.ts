import { SimpleMemoryAllocator } from "./alloc";
import { MemoryManager } from "./manager";
import { HeapAddr, HeapInBytes } from "./node";

export const HEAP_NODE_BYTE_SIZE = {
  tag: 1,
  child: 3,
  data: 4,
};
export const HEAP_NODE_BYTE_INDICES = {
  tag: 0,
  child: HEAP_NODE_BYTE_SIZE.tag,
  data: HEAP_NODE_BYTE_SIZE.tag + HEAP_NODE_BYTE_SIZE.child,
};
export const HEAP_NODE_BYTE_TOTAL_SIZE =
  HEAP_NODE_BYTE_SIZE.tag +
  HEAP_NODE_BYTE_SIZE.child +
  HEAP_NODE_BYTE_SIZE.data;
export const MAX_INT = Math.floor(2 ** (8 * HEAP_NODE_BYTE_SIZE.data) / 2) - 1;
export const MIN_INT = -Math.floor(2 ** (8 * HEAP_NODE_BYTE_SIZE.data) / 2);

export type IHeap = {
  nodeCount: number;
  buf: ArrayBuffer;
};

export function validateHeap(heap: IHeap) {
  if (heap.buf.byteLength !== heap.nodeCount * HEAP_NODE_BYTE_TOTAL_SIZE) {
    throw new Error(
      "Invalid heap. Buffer size does not match heap size:" +
        ` ${heap.buf.byteLength} !== ${heap.nodeCount} * ${HEAP_NODE_BYTE_TOTAL_SIZE}`
    );
  }

  // Addressable area must exclude NULL (0) address.
  if (heap.nodeCount > 2 ** 8 * HEAP_NODE_BYTE_SIZE.child - 1 - 1) {
    // Addressable area defined by pointer size.
    // Unaligned pointers are not supported, a pointer directly
    // points to the start of a heap node.
    throw new Error(
      "Invalid heap. Addressable area exceeded." +
        ` ${heap.nodeCount} > ${2 ** 8 * HEAP_NODE_BYTE_SIZE.child - 1 - 1}`
    );
  }
}

export type IUntypedAllocator = {
  getNewHeapAddress(): HeapAddr;
  getNewHeapAddresses(size: number): HeapAddr[];
  setHeapValueInBytes(addr: HeapAddr, val: number[]): void;
  getHeapValueInBytes(addr: HeapAddr): number[];
  printHeap(): string[];
  getNodeCount(): number;
};

export type IAllocator = {
  getHeapValue(addr: HeapAddr): HeapInBytes;
  setHeapValue(addr: HeapAddr, val: HeapInBytes): void;

  allocBool(data: boolean): HeapAddr;
  allocInt(data: number): HeapAddr;
  allocString(data: string): HeapAddr;
  allocBinaryPtr(child1: HeapAddr, child2?: HeapAddr): HeapAddr;
} & IUntypedAllocator;

export function createHeapManager(heapNodeCount: number): IAllocator {
  const size = heapNodeCount * HEAP_NODE_BYTE_TOTAL_SIZE;
  return new MemoryManager(
    new SimpleMemoryAllocator({
      nodeCount: heapNodeCount,
      buf: new ArrayBuffer(size),
    })
  );
}

export {
  AnyHeapValue,
  HeapAddr,
  HeapInBytes,
  HeapType,
  HeapValue,
} from "./node";
