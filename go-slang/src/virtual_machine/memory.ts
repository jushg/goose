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
import { InstrAddr } from "../common/instructionObj";
import { Allocator, HeapAddr, HeapType, createHeapManager } from "../memory";
import {
  AnyHeapValue,
  GcFlag,
  HeapInBytes,
  assertHeapType,
} from "../memory/node";
import { GoslingScopeObj, getScopeObj, readScopeData } from "./scope";
import { ThreadStatus } from "./threadControl";

export type SpecialFrameLabels = "CALL" | "FOR";
export type ThreadData = {
  pc: InstrAddr;
  rts: HeapAddr;
  os: HeapAddr;
  status: ThreadStatus;
};

export function createGoslingMemoryManager(
  nodeCount: number
): GoslingMemoryManager {
  return new GoslingMemoryManager(
    createHeapManager(nodeCount),
    createHeapManager(nodeCount)
  );
}

export class GoslingMemoryManager implements IGoslingMemoryManager {
  memory: Allocator;
  standbyMemory: Allocator;
  threadDataMap: Map<string, ThreadData>;

  constructor(memory: Allocator, standbyMemory: Allocator) {
    this.memory = memory;
    this.standbyMemory = standbyMemory;
    this.threadDataMap = new Map();
  }

  allocThreadData(id: string, data: ThreadData) {
    this.threadDataMap.set(id, data);
    return id;
  }

  setThreadData(id: string, update: Partial<ThreadData>) {
    if (!this.threadDataMap.has(id))
      throw new Error(`Thread with id ${id} not found`);

    const threadData = this.threadDataMap.get(id)!;
    this.threadDataMap.set(id, {
      pc: update.pc ?? threadData.pc,
      rts: update.rts ?? threadData.rts,
      os: update.os ?? threadData.os,
      status: update.status ?? threadData.status,
    });
  }

  getThreadData(id: string): ThreadData {
    if (!this.threadDataMap.has(id))
      throw new Error(`Thread with id ${id} not found`);
    return this.threadDataMap.get(id)!;
  }

  getMemoryRoots(): HeapAddr[] {
    return Array.from(this.threadDataMap.values()).flatMap(({ rts, os }) => [
      rts,
      os,
    ]);
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
      arr.push({ nodeAddr: ptr.addr });

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
      prevList = [{ nodeAddr: newNode.addr }, ...prevList!];
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
      throw new Error(`Invalid heap value at ${addr}: ${e}`);
    }
  }

  setHeapValue(addr: HeapAddr, val: AnyHeapValue) {
    this.memory.setHeapValue(addr, HeapInBytes.fromData(val));
  }

  allocNewFrame(prev: GoslingScopeObj, symbols: string[]): GoslingScopeObj {
    const envKeyValueList = symbols.flatMap((s) => {
      const symbolStr = this.alloc({ type: HeapType.String, data: s });
      return [symbolStr.addr, HeapAddr.getNull()];
    });

    const envAddr =
      this.allocList(envKeyValueList).at(0)?.nodeAddr || HeapAddr.getNull();
    const newFrameAddr = this.allocList([envAddr], prev.getScopeData());

    return this.getEnvs(newFrameAddr.at(0)?.nodeAddr || HeapAddr.getNull());
  }

  allocNewSpecialFrame(args: {
    pc: InstrAddr;
    rts: GoslingScopeObj;
    os: HeapAddr;
    label: SpecialFrameLabels;
    baseOfNewFrameAddr: HeapAddr;
  }): GoslingScopeObj {
    const { pc, rts, os, label, baseOfNewFrameAddr } = args;
    const pcObj = { type: HeapType.Int, data: pc.addr } as const;
    const ptrToRts = {
      type: HeapType.BinaryPtr,
      child1: rts.getTopScopeAddr(),
      child2: HeapAddr.getNull(),
    } as const;
    const ptrToOs = {
      type: HeapType.BinaryPtr,
      child1: os,
      child2: HeapAddr.getNull(),
    } as const;
    const symbolAndValues: Record<string, Literal<AnyGoslingObject>> = {};
    symbolAndValues["__pc"] = pcObj;
    symbolAndValues["__os"] = ptrToOs;
    symbolAndValues["__ptrToRts"] = ptrToRts;
    symbolAndValues["__label"] = { type: HeapType.String, data: label };
    const baseOfNewFrame = this.getEnvs(baseOfNewFrameAddr);
    const newSpecialFrame: GoslingScopeObj = this.allocNewFrame(
      baseOfNewFrame,
      Object.keys(symbolAndValues)
    );
    for (const [symbol, value] of Object.entries(symbolAndValues)) {
      newSpecialFrame.assign(symbol, value);
    }
    return newSpecialFrame;
  }

  allocNewCallFrame(args: {
    callerPC: InstrAddr;
    callerRTS: GoslingScopeObj;
    lambdaClosure: HeapAddr;
    postCallOsAddr: HeapAddr;
  }): GoslingScopeObj {
    const {
      callerPC: pc,
      callerRTS: rts,
      lambdaClosure: baseOfNewFrameAddr,
      postCallOsAddr: os,
    } = args;
    return this.allocNewSpecialFrame({
      pc,
      rts,
      baseOfNewFrameAddr,
      os,
      label: "CALL",
    });
  }

  allocNewForFrame(args: {
    continuePC: InstrAddr;
    continueRTS: GoslingScopeObj;
  }): GoslingScopeObj {
    const { continuePC, continueRTS } = args;
    return this.allocNewSpecialFrame({
      pc: continuePC,
      rts: continueRTS,
      label: "FOR",
      baseOfNewFrameAddr: continueRTS.getTopScopeAddr(),
      os: HeapAddr.getNull(),
    });
  }

  getEnclosingFrame(prev: GoslingScopeObj): GoslingScopeObj {
    const envs = prev.getScopeData();
    if (envs.length < 2)
      throw new Error(
        `Trying to exit scope from ${envs.at(0)?.nodeAddr} (envs of len ${envs.length})`
      );

    if (`__label` in envs[0].env) {
      throw new Error(
        `Exiting special frame (${envs[0].env["__label"]}) as if it was normal`
      );
    }

    const enclosingScopeData = [...prev.getScopeData()].slice(1);
    return getScopeObj(enclosingScopeData, this);
  }

  getEnclosingSpecialFrame(prev: GoslingScopeObj, label: SpecialFrameLabels) {
    let envs = prev.getScopeData();

    const id = envs.findIndex((env) => {
      if (!("__label" in env.env)) {
        return false;
      }
      const ptrToLabel = this.get(env.env["__label"].valueListPtr);
      assertGoslingType(HeapType.BinaryPtr, ptrToLabel);
      const labelObj = this.get(ptrToLabel.child2);
      assertGoslingType(HeapType.String, labelObj);
      return labelObj.data.replace(/\0/g, "") == label.replace(/\0/g, "");
    });

    if (id === -1) {
      throw new Error(
        `Cannot find special frame ${label} in ${prev.getTopScopeAddr()}`
      );
    }

    const {
      __pc: { valueListPtr: nodeOfPcAddr },
      __ptrToRts: { valueListPtr: nodeOfRtsPtrAddr },
      __os: { valueListPtr: nodeOfOsPtrAddr },
    } = envs[id].env;

    const nodeOfPc = this.get(nodeOfPcAddr);
    assertGoslingType(HeapType.BinaryPtr, nodeOfPc);
    const nodeOfRtsPtr = this.get(nodeOfRtsPtrAddr);
    assertGoslingType(HeapType.BinaryPtr, nodeOfRtsPtr);
    const nodeOfOsPtr = this.get(nodeOfOsPtrAddr);
    assertGoslingType(HeapType.BinaryPtr, nodeOfOsPtr);

    const pc = this.get(nodeOfPc.child2);
    assertGoslingType(HeapType.Int, pc);

    const rtsPtr = this.get(nodeOfRtsPtr.child2);
    assertGoslingType(HeapType.BinaryPtr, rtsPtr);

    const osPtr = this.get(nodeOfOsPtr.child2);
    assertGoslingType(HeapType.BinaryPtr, osPtr);

    return {
      pc: InstrAddr.fromNum(pc.data),
      rts: rtsPtr.child1,
      os: osPtr.child1,
    };
  }

  runGarbageCollection() {
    for (const root of this.getMemoryRoots()) {
      this.copy(root);
    }

    let scanPtr = this.standbyMemory.getFirstAllocatedHeapAddress();
    while (!scanPtr.isNull()) {
      let curHeapNode = this.standbyMemory.getHeapValue(scanPtr).toHeapValue();

      switch (curHeapNode.type) {
        case HeapType.String:
          curHeapNode.next = this.copy(curHeapNode.next);
          break;
        case HeapType.BinaryPtr:
          curHeapNode.child1 = this.copy(curHeapNode.child1);
          curHeapNode.child2 = this.copy(curHeapNode.child2);
          break;
        case HeapType.Bool:
        case HeapType.Int:
          break;
        default: {
          const _: never = curHeapNode;
          throw new Error(`Unexpected heap type: ${curHeapNode}`);
        }
      }
      this.standbyMemory.setHeapValue(
        scanPtr,
        HeapInBytes.fromData(curHeapNode)
      );
      scanPtr = this.standbyMemory.getNextAllocatedHeapAddress(scanPtr);
    }

    this.threadDataMap = new Map(
      [...this.threadDataMap].map(([key, threadData]) => [
        key,
        {
          ...threadData,
          rts: this.copy(threadData.rts),
          os: this.copy(threadData.os),
        },
      ])
    );

    [this.memory, this.standbyMemory] = [this.standbyMemory, this.memory];
    this.standbyMemory.reset();
  }

  private copy(addr: HeapAddr) {
    if (addr.isNull()) return addr;
    const node = this.getHeapValue(addr);
    if (node.gcFlag === GcFlag.Marked) {
      assertHeapType(HeapType.BinaryPtr, node);
      return node.child1;
    }

    const fwdAddr = this.standbyMemory.getNewHeapAddress();
    this.standbyMemory.setHeapValue(fwdAddr, HeapInBytes.fromData(node));
    this.setHeapValue(addr, {
      type: HeapType.BinaryPtr,
      child1: fwdAddr,
      child2: HeapAddr.getNull(),
      gcFlag: GcFlag.Marked,
    });
    return fwdAddr;
  }

  getMemorySize(): number {
    return this.memory.getNodeCount();
  }

  getMemoryAllocated(): number {
    return this.memory.getAllocatedNodeCount();
  }

  getMemoryResidency(): number {
    const visited: HeapAddr[] = [];
    const roots = this.getMemoryRoots().filter((r) => !r.isNull());

    while (roots.length > 0) {
      const curAddr = roots.pop()!;
      visited.push(curAddr);
      const curHeapNode = this.getHeapValue(curAddr);
      if (curHeapNode === null) continue;
      const newAdd: HeapAddr[] = [];
      switch (curHeapNode.type) {
        case HeapType.BinaryPtr: {
          newAdd.push(curHeapNode.child1);
          newAdd.push(curHeapNode.child2);
          break;
        }
        case HeapType.String: {
          newAdd.push(curHeapNode.next);
          break;
        }
        case HeapType.Int:
        case HeapType.Bool:
          break;
        default: {
          const _: never = curHeapNode;
          throw new Error(`Unexpected heap type: ${curHeapNode}`);
        }
      }
      newAdd.forEach((addr) => {
        if (!addr.isNull() && !visited.find((a) => a.equals(addr))) {
          roots.push(addr);
        }
      });
    }
    return visited.length;
  }
}
