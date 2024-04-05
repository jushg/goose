import { Allocator } from "./alloc";
import { HeapAddr } from "./node";
import { SimpleMemoryAllocator } from "./untypedAlloc";

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

type EightTupleNum = [
  number,
  number,
  number,
  number,

  number,
  number,
  number,
  number,
];

export type IHeap = {
  nodeCount: number;
  buf: EightTupleNum[];
};

export function validateHeap(heap: IHeap) {
  if (heap.buf[0].length !== HEAP_NODE_BYTE_TOTAL_SIZE) {
    throw new Error(
      "Invalid heap. Node size does not match with buf:" +
        ` ${heap.buf[0].length} !== * ${HEAP_NODE_BYTE_TOTAL_SIZE}`
    );
  }
  if (heap.buf.length !== heap.nodeCount) {
    throw new Error(
      "Invalid heap. Buffer size does not match heap size:" +
        ` ${heap.buf.length} !== ${heap.nodeCount}`
    );
  }

  // Addressable area must exclude NULL (0) address.
  if (heap.nodeCount > 2 ** (8 * HEAP_NODE_BYTE_SIZE.child) - 1 - 1) {
    // Addressable area defined by pointer size.
    // Unaligned pointers are not supported, a pointer directly
    // points to the start of a heap node.
    throw new Error(
      "Invalid heap. Addressable area exceeded." +
        ` ${heap.nodeCount} > ${2 ** (8 * HEAP_NODE_BYTE_SIZE.child) - 1 - 1}`
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

export function createHeapManager(heapNodeCount: number): Allocator {
  return new Allocator(
    new SimpleMemoryAllocator({
      nodeCount: heapNodeCount,
      buf: new Array(heapNodeCount).fill(0).map(() => [0, 0, 0, 0, 0, 0, 0, 0]),
    })
  );
}

export { Allocator } from "./alloc";
export {
  AnyHeapValue,
  HeapAddr,
  HeapInBytes,
  HeapType,
  HeapValue,
} from "./node";
