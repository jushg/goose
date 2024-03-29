import {
  AnyGoslingObject,
  GoslingBinaryPtrObj,
  GoslingLambdaObj,
  GoslingListObj,
  GoslingObject,
  IGoslingMemoryManager,
  Literal,
  assertGoslingType,
  isGoslingType,
} from ".";
import { InstrAddr } from "../instruction/base";
import { Allocator, HeapAddr, HeapType } from "../memory";
import { HeapInBytes, assertHeapType } from "../memory/node";
import { GoslingScopeObj, getScopeObj, readScopeData } from "./scope";

export class GoslingMemoryManager implements IGoslingMemoryManager {
  memory: Allocator;

  constructor(memory: Allocator) {
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

  getList(addr: HeapAddr): GoslingListObj {
    if (addr.isNull()) return [];

    const arr: GoslingListObj = [];
    let curr: HeapAddr = addr;
    while (!curr.isNull()) {
      const ptr = this.get(curr);
      if (ptr === null) break;

      assertGoslingType(HeapType.BinaryPtr, ptr);
      arr.push({ nodeAddr: curr, node: ptr, value: this.get(ptr.child2) });

      if (ptr.child1 === null) break;
      curr = ptr.child1;
    }

    return arr;
  }

  setList(list: GoslingListObj, idx: number, val: Literal<AnyGoslingObject>) {
    if (idx < 0 || idx >= list.length) {
      throw new Error(`Index ${idx} out of bounds for list at ${list}`);
    }

    const { nodeAddr } = list[idx];
    const node = this.get(nodeAddr);
    if (node === null || !isGoslingType(HeapType.BinaryPtr, node))
      throw new Error(`Invalid list iterator at ${nodeAddr}: ${node}`);

    const { child1 } = node;
    const newItem = this.alloc(val);

    this.set(nodeAddr, {
      type: HeapType.BinaryPtr,
      child1,
      child2: newItem.addr,
    });
    list[idx].node = { ...node, child2: newItem.addr };
    list[idx].value = newItem;
  }

  allocList(toAppend: HeapAddr[], prevList?: GoslingListObj): GoslingListObj {
    prevList = prevList ?? [];
    let prevListAddr: HeapAddr = prevList.at(0)?.nodeAddr ?? HeapAddr.getNull();

    for (const valAddr of toAppend.reverse()) {
      const newNode = this.alloc({
        type: HeapType.BinaryPtr,
        child1: prevListAddr,
        child2: valAddr,
      });
      prevList = [
        { nodeAddr: newNode.addr, node: newNode, value: this.get(valAddr) },
        ...prevList!,
      ];
      prevListAddr = prevList[0].nodeAddr;
    }

    return this.getList(prevListAddr);
  }

  getEnvs(addr: HeapAddr): GoslingScopeObj {
    return getScopeObj(readScopeData(addr, this), this);
  }

  getLambda(lambdaPtr: GoslingBinaryPtrObj): GoslingLambdaObj {
    assertGoslingType(HeapType.BinaryPtr, lambdaPtr);

    const closureAddr = lambdaPtr.child1;
    const pcAddrObj = this.get(lambdaPtr.child2);

    if (pcAddrObj === null)
      throw new Error(
        `Invalid pcAddrObj for lambda ${JSON.stringify(lambdaPtr)}`
      );
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
    if ("addr" in data) delete data.addr;

    switch (data.type) {
      case HeapType.Bool: {
        const d = data as Literal<GoslingObject<HeapType.Bool>>;
        const addr = this.memory.allocBool(d.data);
        return { ...d, addr };
      }
      case HeapType.Int: {
        const d = data as Literal<GoslingObject<HeapType.Int>>;
        const addr = this.memory.allocInt(d.data);
        return { ...d, addr };
      }
      case HeapType.String: {
        const d = data as Literal<GoslingObject<HeapType.String>>;
        const addr = this.memory.allocString(d.data);
        return { ...d, addr };
      }
      case HeapType.BinaryPtr: {
        const { child1, child2 } = data as Literal<
          GoslingObject<HeapType.BinaryPtr>
        >;
        const addr = this.memory.allocBinaryPtr(child1, child2);
        return { type: HeapType.BinaryPtr, child1, child2, addr };
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

  allocNewFrame(
    prev: GoslingScopeObj,
    symbolAndValues: Record<string, Literal<AnyGoslingObject>>
  ): GoslingScopeObj {
    const envKeyValueList = Object.keys(symbolAndValues).flatMap((s) => {
      const symbolStr = this.alloc({ type: HeapType.String, data: s });
      const value = this.alloc(symbolAndValues[s]);
      return [symbolStr.addr, value.addr];
    });

    const envAddr =
      this.allocList(envKeyValueList).at(0)?.nodeAddr || HeapAddr.getNull();
    const newFrameAddr = this.allocList([envAddr], prev.getScopeData());

    return this.getEnvs(newFrameAddr.at(0)?.nodeAddr || HeapAddr.getNull());
  }

  allocNewJumpFrame(
    callerPC: InstrAddr,
    prev: GoslingScopeObj,
    newFrame: HeapAddr
  ): GoslingScopeObj {
    const __callerPC = { type: HeapType.Int, data: callerPC.addr } as const;
    const __callerRTS = {
      type: HeapType.BinaryPtr,
      child1: prev.getTopScopeAddr(),
      child2: HeapAddr.getNull(),
    } as const;
    const symbolAndValues: Record<string, Literal<AnyGoslingObject>> = {
      __callerPC,
      __callerRTS,
    };

    const closure = this.getEnvs(newFrame);
    return this.allocNewFrame(closure, symbolAndValues);
  }

  getEnclosingFrame(prev: GoslingScopeObj): {
    callerPC: InstrAddr | null;
    enclosing: GoslingScopeObj;
  } {
    const envs = prev.getScopeData();
    if (envs.length < 2)
      throw new Error(
        `Trying to exit scope from ${envs.at(0)?.nodeAddr} (envs of len ${envs.length})`
      );

    const frameToExit = envs[0].env;
    if ("__callerPC" in frameToExit && "__callerRTS" in frameToExit) {
      const callerPC = frameToExit.__callerPC.valueObj;
      const callerRTS = frameToExit.__callerRTS.valueObj;

      if (
        callerPC === null ||
        callerRTS === null ||
        !isGoslingType(HeapType.Int, callerPC) ||
        !isGoslingType(HeapType.BinaryPtr, callerRTS)
      )
        throw new Error(
          `Invalid frame to exit at ${envs.at(0)?.nodeAddr} (callerPC=${callerPC}, callerRTS=${callerRTS})`
        );

      return {
        callerPC: InstrAddr.fromNum(callerPC.data),
        enclosing: this.getEnvs(callerRTS.child1),
      };
    }

    const enclosingScopeData = [...prev.getScopeData()].slice(1);
    return {
      callerPC: null,
      enclosing: getScopeObj(enclosingScopeData, this),
    };
  }
}
