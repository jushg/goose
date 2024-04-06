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
import { GcFlag, HeapInBytes, assertHeapType } from "../memory/node";
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

  alloc(
    data: Literal<AnyGoslingObject>,
    canRunGC: boolean = true
  ): AnyGoslingObject {
    if ("addr" in data) delete data.addr;

    try {
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
    } catch (e) {
      if (!(e instanceof Error) || !e.message.includes("Heap overflow")) {
        throw e;
      }

      if (!canRunGC) {
        throw new Error(`Heap overflow: ${e} with garbage collection failed`);
      }
      this.runGarbageCollection();
      return this.alloc(data, false);
    }
  }

  getHeapValue(addr: HeapAddr) {
    try {
      return this.memory.getHeapValue(addr).toHeapValue();
    } catch (e) {
      throw new Error(`Invalid heap value at ${addr}: ${e}`);
    }
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

  allocNewSpecialFrame(
    pc: InstrAddr,
    rts: GoslingScopeObj,
    label: SpecialFrameLabels,
    baseOfNewFrameAddr: HeapAddr
  ): GoslingScopeObj {
    const pcObj = { type: HeapType.Int, data: pc.addr } as const;
    const ptrToRts = {
      type: HeapType.BinaryPtr,
      child1: rts.getTopScopeAddr(),
      child2: HeapAddr.getNull(),
    } as const;
    const symbolAndValues: Record<string, Literal<AnyGoslingObject>> = {};
    symbolAndValues["__pc"] = pcObj;
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

  allocNewCallFrame(
    callerPC: InstrAddr,
    callerRTS: GoslingScopeObj,
    newFrame: HeapAddr
  ): GoslingScopeObj {
    return this.allocNewSpecialFrame(callerPC, callerRTS, "CALL", newFrame);
  }

  allocNewForFrame(
    continuePC: InstrAddr,
    continueRTS: GoslingScopeObj
  ): GoslingScopeObj {
    return this.allocNewSpecialFrame(
      continuePC,
      continueRTS,
      "FOR",
      continueRTS.getTopScopeAddr()
    );
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
      const labelObj = env.env["__label"].valueObj;
      assertGoslingType(HeapType.String, labelObj);
      return labelObj.data.replace(/\0/g, "") == label.replace(/\0/g, "");
    });

    if (id === -1) {
      throw new Error(
        `Cannot find special frame ${label} in ${prev.getTopScopeAddr()}`
      );
    }

    const {
      __pc: { valueObj: pc },
      __ptrToRts: { valueObj: rtsPtr },
    } = envs[id].env;
    assertGoslingType(HeapType.Int, pc);
    assertGoslingType(HeapType.BinaryPtr, rtsPtr);

    return { pc: InstrAddr.fromNum(pc.data), rts: this.getEnvs(rtsPtr.child1) };
  }

  runGarbageCollection() {
    let reachableNodes = this.getAllReachableNodesFromRoot();
    let nodesMap: { [key: string]: HeapAddr } = {};

    let getNewAddr = (addr: HeapAddr) => {
      if (addr.isNull() || !(addr.toString() in nodesMap))
        return HeapAddr.getNull();
      return nodesMap[addr.toString()];
    };

    reachableNodes.forEach((addr) => {
      nodesMap[addr.toString()] = this.createStandbyCopy(addr);
    });

    reachableNodes.forEach((addr) => {
      let oldNode = this.get(addr);
      if (oldNode === null || oldNode.type !== HeapType.BinaryPtr) return;
      let newNodeAddr = getNewAddr(addr);

      let heapValue = this.standbyMemory
        .getHeapValue(newNodeAddr)
        .toHeapValue();
      if (heapValue.type !== HeapType.BinaryPtr) {
        throw new Error(
          `Unexpected heap type: ${heapValue.type}, expected BinaryPtr`
        );
      }
      heapValue.child1 = getNewAddr(oldNode.child1);

      heapValue.child2 = getNewAddr(oldNode.child2);

      this.standbyMemory.setHeapValue(
        newNodeAddr,
        HeapInBytes.fromData(heapValue)
      );
    });

    this.threadDataMap = new Map(
      [...this.threadDataMap].map(([key, threadData]) => [
        key,
        {
          ...threadData,
          rts: getNewAddr(threadData.rts),
          os: getNewAddr(threadData.os),
        },
      ])
    );

    [this.memory, this.standbyMemory] = [this.standbyMemory, this.memory];
    this.standbyMemory.reset();
  }

  createStandbyCopy(addr: HeapAddr): HeapAddr {
    let oldNode = this.get(addr);
    if (oldNode === null) return HeapAddr.getNull();
    switch (oldNode.type) {
      case HeapType.BinaryPtr: {
        return this.standbyMemory.allocBinaryPtr(
          HeapAddr.getNull(),
          HeapAddr.getNull()
        );
      }
      case HeapType.String: {
        return this.standbyMemory.allocString(oldNode.data);
      }
      case HeapType.Int:
        return this.standbyMemory.allocInt(oldNode.data);
      case HeapType.Bool:
        return this.standbyMemory.allocBool(oldNode.data);
      default:
        throw new Error(`Unexpected heap type: ${oldNode}`);
    }
  }

  getAllReachableNodesFromRoot(): HeapAddr[] {
    const visited: HeapAddr[] = [];
    const roots = this.getMemoryRoots().filter((r) => !r.isNull());

    while (roots.length > 0) {
      const rootAddr = roots.pop()!;
      visited.push(rootAddr);
      const rootNode = this.get(rootAddr);
      if (rootNode === null || rootNode.type !== HeapType.BinaryPtr) continue;

      [rootNode.child1, rootNode.child2].forEach((addr) => {
        if (!addr.isNull() && !visited.find((a) => a.equals(addr))) {
          roots.push(addr);
        }
      });
    }
    return visited;
  }
}
