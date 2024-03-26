import { InstrAddr } from "../instruction/base";
import { HeapAddr, HeapType, IAllocator } from "../memory";
import { HeapInBytes, assertHeapType } from "../memory/node";
import {
  AnyGoslingObject,
  GoslingLambdaObj,
  GoslingObject,
  IGoslingMemoryManager,
  Literal,
} from "./memory";
import { assertGoslingType } from ".";
import { GoslingScopeObj } from "./scope";
import { getScopeObj, readScopeData } from "./scope";

export class GoslingMemoryManager implements IGoslingMemoryManager {
  memory: IAllocator;

  constructor(memory: IAllocator) {
    this.memory = memory;
  }

  get(addr: HeapAddr): AnyGoslingObject | null {
    if (addr.isNull()) {
      return null;
    }

    const heapValue = this.getHeapValue(addr);
    const { type } = heapValue;

    switch (type) {
      case HeapType.Bool: {
        const val = this.getHeapValue(addr);
        assertHeapType(HeapType.Bool, val);
        return { addr, type: HeapType.Bool, data: val.data };
      }
      case HeapType.Int: {
        const val = this.getHeapValue(addr);
        assertHeapType(HeapType.Int, val);
        return { addr, type: HeapType.Int, data: val.data };
      }
      case HeapType.String: {
        let concatenated = "";
        let curr = addr;
        while (curr.isNull() === false) {
          const val = this.getHeapValue(curr);
          assertHeapType(HeapType.String, val);
          concatenated += val.data;
          curr = val.next;
        }

        return {
          addr,
          type: HeapType.String,
          data: concatenated.replace(/\0/g, ""),
        };
      }
      case HeapType.BinaryPtr: {
        const val = this.getHeapValue(addr);
        assertHeapType(HeapType.BinaryPtr, val);
        const { child1, child2 } = val;
        return { addr, type: HeapType.BinaryPtr, child1, child2 };
      }
      default: {
        const _: never = type;
        throw new Error(`Invalid heap type at ${addr}: ${type}`);
      }
    }
  }

  getList(addr: HeapAddr) {
    if (addr.isNull()) return [];

    const arr: HeapAddr[] = [];
    let curr: HeapAddr = addr;
    while (!curr.isNull()) {
      const ptr = this.get(curr);
      if (ptr === null) break;

      assertGoslingType(HeapType.BinaryPtr, ptr);
      arr.push(ptr.child2);

      if (ptr.child1 === null) break;
      curr = ptr.child1;
    }

    return arr.map((valAddr, idx) => {
      const val = this.get(valAddr);
      if (val === null)
        throw new Error(`Invalid object at ${idx} from list at ${addr}`);
      return { ptr: valAddr, val };
    });
  }

  setList(addr: HeapAddr, idx: number, val: Literal<AnyGoslingObject>) {
    const list = this.getList(addr);
    if (idx < 0 || idx >= list.length) {
      throw new Error(`Index ${idx} out of bounds for list at ${addr}`);
    }

    const { ptr } = list[idx];
    const listIterator = this.get(ptr);
    if (listIterator === null)
      throw new Error(`Invalid list iterator at ${ptr}`);
    assertGoslingType(HeapType.BinaryPtr, listIterator);

    const { child1, child2 } = listIterator;
    const newItem = this.alloc(val);
    this.set(ptr, { type: HeapType.BinaryPtr, child1, child2: newItem.addr });
  }

  allocList(toAppend: HeapAddr[], prevListAddr?: HeapAddr): HeapAddr {
    prevListAddr = prevListAddr ?? HeapAddr.getNull();
    for (const valAddr of toAppend.reverse()) {
      prevListAddr = this.alloc({
        type: HeapType.BinaryPtr,
        child1: prevListAddr,
        child2: valAddr,
      }).addr;
    }

    return prevListAddr;
  }

  getEnvs(addr: HeapAddr): GoslingScopeObj {
    return getScopeObj(readScopeData(addr, this), this);
  }

  getLambda(addr: HeapAddr): GoslingLambdaObj {
    const val = this.get(addr);
    if (val === null) throw new Error(`Invalid lambda at ${addr}`);
    assertGoslingType(HeapType.BinaryPtr, val);

    const closureAddr = val.child1;
    const pcAddrObj = this.get(val.child2);

    if (pcAddrObj === null) throw new Error(`Invalid pcAddr at lambda ${addr}`);
    assertGoslingType(HeapType.Int, pcAddrObj);

    const closure = this.getEnvs(closureAddr);
    const pcAddr = pcAddrObj.data;
    return { closure, pcAddr: InstrAddr.fromNum(pcAddr) };
  }

  allocLambda(closureAddr: HeapAddr, pcAddr: InstrAddr): HeapAddr {
    const pcAddrObj = this.alloc({ type: HeapType.Int, data: pcAddr.addr });
    return this.memory.allocBinaryPtr(closureAddr, pcAddrObj.addr);
  }

  set(addr: HeapAddr, val: Literal<AnyGoslingObject>): void {
    const allocatedAddr = this.alloc(val).addr;
    this.memory.setHeapValue(addr, this.memory.getHeapValue(allocatedAddr));
  }

  clear(addr: HeapAddr): void {
    this.memory.setHeapValue(addr, HeapInBytes.getNull());
  }

  alloc(data: Literal<AnyGoslingObject>): AnyGoslingObject {
    switch (data.type) {
      case HeapType.Bool: {
        const d = data as Omit<GoslingObject<HeapType.Bool>, "addr">;
        const addr = this.memory.allocBool(d.data);
        return { addr, ...d };
      }
      case HeapType.Int: {
        const d = data as Omit<GoslingObject<HeapType.Int>, "addr">;
        const addr = this.memory.allocInt(d.data);
        return { addr, ...d };
      }
      case HeapType.String: {
        const d = data as Omit<GoslingObject<HeapType.String>, "addr">;
        const addr = this.memory.allocString(d.data);

        return { addr, ...d };
      }
      case HeapType.BinaryPtr: {
        const { child1, child2 } = data as Omit<
          GoslingObject<HeapType.BinaryPtr>,
          "addr"
        >;
        const addr = this.memory.allocBinaryPtr(child1, child2);
        return { addr, type: HeapType.BinaryPtr, child1, child2 };
      }
      default: {
        const _: never = data;
        throw new Error(`Invalid data: ${data}`);
      }
    }
  }

  getHeapValue(addr: HeapAddr) {
    try {
      return this.memory.getHeapValue(addr).toHeapValue();
    } catch (e) {
      const bytes = this.memory.getHeapValueInBytes(addr);
      throw new Error(`Invalid heap value at ${addr}: [ ${bytes} ]`);
    }
  }
}
