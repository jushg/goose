import { HeapAddr, HeapType } from "go-slang/src/memory";
import {
  GoslingBoolObj,
  GoslingIntObj,
  GoslingStringObj,
  isGoslingType,
} from "go-slang/src/virtual_machine";
import { GoslingMemoryManager } from "go-slang/src/virtual_machine/memory";

export type MemoryState =
  | null
  | GoslingIntObj
  | GoslingStringObj
  | GoslingBoolObj
  | {
      addr: HeapAddr;
      type: HeapType.BinaryPtr;
      child1: null;
      child2: MemoryState | null;
    }
  | (
      | GoslingIntObj
      | GoslingStringObj
      | GoslingBoolObj
      | {
          addr: HeapAddr;
          type: HeapType.BinaryPtr;
          child1: HeapAddr;
          child2: MemoryState | null;
        }
    )[];

export const getMemState = (
  addr: HeapAddr,
  memory: GoslingMemoryManager
): MemoryState => {
  try {
    if (addr.isNull()) return null;

    const node = memory.get(addr);
    if (node === null) return null;

    if (!isGoslingType(HeapType.BinaryPtr, node)) {
      return node;
    }

    if (node.child1.isNull()) {
      return {
        type: HeapType.BinaryPtr,
        addr,
        child1: null,
        child2: getMemState(node.child2, memory),
      };
    }

    const child1 = getMemState(node.child1, memory);
    if (child1 === null) {
      return {
        type: HeapType.BinaryPtr,
        addr,
        child1: null,
        child2: getMemState(node.child2, memory),
      };
    }
    const result: (
      | GoslingIntObj
      | GoslingStringObj
      | GoslingBoolObj
      | {
          addr: HeapAddr;
          type: HeapType.BinaryPtr;
          child1: HeapAddr;
          child2: MemoryState | null;
        }
    )[] = [
      {
        type: HeapType.BinaryPtr,
        addr,
        child1: node.child1,
        child2: getMemState(node.child2, memory),
      },
    ];

    let curr: HeapAddr = node.child1;
    while (!curr.isNull()) {
      const currNode = memory.get(curr);
      if (currNode === null) break;

      if (!isGoslingType(HeapType.BinaryPtr, currNode)) {
        result.push(currNode);
        break;
      }

      result.push({
        type: HeapType.BinaryPtr,
        addr: curr,
        child1: node.child1,
        child2: getMemState(node.child2, memory),
      });
      curr = currNode.child1;
    }

    return result;
  } catch (e) {
    console.error(`error in getFromNodePtr: ${e}`);
    return null;
  }
};
