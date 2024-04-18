import { HeapAddr, HeapType } from "go-slang/src/memory";
import {
  GoslingBoolObj,
  GoslingIntObj,
  GoslingStringObj,
  isGoslingType,
} from "go-slang/src/virtual_machine";
import { GoslingMemoryManager } from "go-slang/src/virtual_machine/memory";

export type MemoryState =
  | { isNull: true }
  | GoslingIntObj
  | GoslingStringObj
  | GoslingBoolObj
  | {
      addr: HeapAddr;
      type: HeapType.BinaryPtr;
      child1: MemoryState | HeapAddr | null;
      child2: MemoryState | HeapAddr | null;
    };

export const getMemState = (
  roots: HeapAddr[],
  memory: GoslingMemoryManager
): Record<string, MemoryState> => {
  const map = new Map<string, MemoryState | { isToBeDetermined: true }>();
  map.set(HeapAddr.getNull().toString(), { isNull: true });

  console.dir(roots);
  roots.forEach((addr) => map.set(addr.toString(), { isToBeDetermined: true }));

  const addresses = [...roots];
  while (addresses.length > 0) {
    console.count("getMemState loop");
    const addr = addresses.pop()!;
    if (!map.has(addr.toString())) {
      throw new Error(`Expected ${addr} to be in map`);
    }

    const val = map.get(addr.toString())!;
    if (!("isToBeDetermined" in val)) continue;

    const node = memory.get(addr);
    if (node === null) {
      delete (val as any).isToBeDetermined;
      (val as any)["isNull"] = true;

      continue;
    } else if (!isGoslingType(HeapType.BinaryPtr, node)) {
      delete (val as any).isToBeDetermined;
      for (const key in node) {
        (val as any)[key] = (node as any)[key];
      }
      continue;
    }

    addresses.push(node.child2);
    if (!map.has(node.child1.toString())) {
      map.set(node.child1.toString(), { isToBeDetermined: true });
      addresses.push(node.child1);
    }

    if (!map.has(node.child2.toString())) {
      map.set(node.child2.toString(), { isToBeDetermined: true });
      addresses.push(node.child2);
    }

    delete (val as any).isToBeDetermined;
    for (const key in node) {
      (val as any)[key] = (node as any)[key];
    }

    (val as any).child1 = map.get(node.child1.toString())! as any;
    (val as any).child2 = map.get(node.child2.toString())! as any;
  }

  const result: Record<string, MemoryState> = {};
  for (const [addr, val] of map.entries()) {
    if ("isToBeDetermined" in val) throw new Error("Unexpected state");
    result[addr.toString()] = require("json-cycle").decycle(val) as MemoryState;
  }
  return result;
};

function isCyclic(obj: any) {
  var seenObjects: any[] = [];
  var mark = String(Math.random());

  function detect(obj: any) {
    if (typeof obj === "object") {
      if (mark in obj) {
        return false;
      }
      obj[mark] = true;
      seenObjects.push(obj);
      for (var key in obj) {
        if (obj.hasOwnProperty(key) && !detect(obj[key])) {
          return false;
        }
      }
    }
    return true;
  }

  var result = detect(obj);

  for (var i = 0; i < seenObjects.length; ++i) {
    delete seenObjects[i][mark];
  }

  return result;
}
