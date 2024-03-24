import {
  AnyGoslingObject,
  GoslingKeyValueList,
  GoslingList,
  GoslingObject,
  GoslingType,
  IGoslingMemoryManager,
  assertGoslingType,
  isGoslingType,
} from ".";
import {
  HEAP_NODE_BYTE_TOTAL_SIZE,
  HeapAddr,
  HeapType,
  HeapValue,
  IAllocator,
} from "../../memory";
import { HeapInBytes, assertHeapType, isHeapType } from "../../memory/node";

function heapTypeMapper(type: HeapType) {
  switch (type) {
    case HeapType.Bool:
      return GoslingType.Bool;
    case HeapType.Int:
      return GoslingType.Int;
    case HeapType.String:
      return GoslingType.String;
    case HeapType.Lambda:
      return GoslingType.Lambda;
    case HeapType.Frame:
      return GoslingType.Frame;
    case HeapType.Value:
      return GoslingType.Value;
    case HeapType.HeapAddr:
      return GoslingType.Ptr;
    default: {
      const _: never = type;
      throw new Error(`Invalid heap type: ${type}`);
    }
  }
}

class GoslingMemoryManager implements IGoslingMemoryManager {
  memory: IAllocator;

  constructor(memory: IAllocator) {
    this.memory = memory;
  }

  get(addr: HeapAddr): AnyGoslingObject | null {
    if (addr.isNull()) {
      return null;
    }

    const heapValue = this.getHeapValue(addr);
    const type = heapTypeMapper(heapValue.type);

    switch (type) {
      case GoslingType.Bool: {
        const val = this.getHeapValue(addr);
        assertHeapType(HeapType.Bool, val);
        return { addr, type: GoslingType.Bool, data: val.data };
      }
      case GoslingType.Int: {
        const val = this.getHeapValue(addr);
        assertHeapType(HeapType.Int, val);
        return { addr, type: GoslingType.Int, data: val.data };
      }
      case GoslingType.String: {
        let concatenated = "";
        let curr = addr;
        while (curr.isNull() === false) {
          const val = this.getHeapValue(curr);
          assertHeapType(HeapType.String, val);
          concatenated += val.data;
          curr = val.child;
        }

        return {
          addr,
          type: GoslingType.String,
          data: concatenated.replace(/\0/g, ""),
        };
      }
      case GoslingType.Lambda: {
        const val = this.getHeapValue(addr);
        assertHeapType(HeapType.Lambda, val);
        const closure = this.get(val.child);
        if (closure !== null) assertGoslingType(GoslingType.Frame, closure);
        return { addr, type: GoslingType.Lambda, pcAddr: val.data, closure };
      }
      case GoslingType.Frame: {
        const val = this.getHeapValue(addr);
        assertHeapType(HeapType.Frame, val);
        const env = this.get(val.data);
        if (env !== null) assertGoslingType(GoslingType.KeyValueList, env);
        const parentEnv = this.get(val.child);
        if (parentEnv !== null) assertGoslingType(GoslingType.Frame, parentEnv);
        return { addr, type: GoslingType.Frame, env, parentEnv };
      }
      case GoslingType.Value: {
        const val = this.getHeapValue(addr);
        assertHeapType(HeapType.Value, val);

        const obj = this.get(val.child);

        const next = this.get(val.child)!;
        if (next !== null) assertGoslingType(GoslingType.Value, next);

        return { addr, type: GoslingType.Value, next, obj };
      }
      case GoslingType.Ptr: {
        const val = this.getHeapValue(addr);
        assertHeapType(HeapType.HeapAddr, val);
        const obj = this.get(val.child);
        return { addr, type: GoslingType.Ptr, obj };
      }
      default: {
        const _: never = type;
        throw new Error(`Invalid heap type at ${addr}: ${type}`);
      }
    }
  }

  getList(ptrToStart: GoslingObject<GoslingType.Ptr>): GoslingList {
    if (ptrToStart === null) throw new Error(`Invalid start: ${ptrToStart}`);
    assertGoslingType(GoslingType.Ptr, ptrToStart);

    const addr = ptrToStart.addr;
    let curr = ptrToStart.obj;
    const arr: GoslingObject<GoslingType.Value>[] = [];
    while (curr !== null) {
      assertGoslingType(GoslingType.Value, curr);
      arr.push(curr);
      curr = curr.next;
    }

    return { addr, type: GoslingType.List, arr };
  }

  getKeyValueList(
    ptrToStart: GoslingObject<GoslingType.Ptr>
  ): GoslingKeyValueList {
    if (ptrToStart === null) throw new Error(`Invalid start: ${ptrToStart}`);
    assertGoslingType(GoslingType.Ptr, ptrToStart);

    const addr = ptrToStart.addr;
    let curr = ptrToStart.obj;
    const arr: {
      k: string;
      v: AnyGoslingObject | null;
      addrs: { k: HeapAddr; v: HeapAddr };
    }[] = [];
    while (curr !== null) {
      assertGoslingType(GoslingType.Value, curr);
      if (curr.obj === null || !isGoslingType(GoslingType.String, curr.obj))
        throw new Error(`Invalid key in: ${curr}`);
      if (curr.next === null) {
        throw new Error(`Invalid value in: ${curr}`);
      }

      const keyAddr = curr.addr;
      const identifier: string = curr.obj.data;

      curr = curr.next;
      const valueAddr = curr.addr;
      const value: AnyGoslingObject | null = curr?.obj ?? null;
      arr.push({
        k: identifier,
        v: value,
        addrs: { k: keyAddr, v: valueAddr },
      });

      // Next 'key' (Value of String type)
      curr = curr.next;
    }

    return { addr, type: GoslingType.KeyValueList, arr };
  }

  set<T extends GoslingType>(
    addr: HeapAddr,
    val: Omit<GoslingObject<T>, "addr">
  ): void {
    const allocatedAddr = this.alloc(val).addr;
    this.memory.setHeapValue(addr, this.memory.getHeapValue(allocatedAddr));
  }

  clear(addr: HeapAddr): void {
    const empty = HeapInBytes.fromBytes(
      new Array(HEAP_NODE_BYTE_TOTAL_SIZE).fill(0)
    );
    this.memory.setHeapValue(addr, empty);
  }

  alloc(data: Omit<AnyGoslingObject, "addr">): AnyGoslingObject {
    switch (data.type) {
      case GoslingType.Bool: {
        const d = data as Omit<GoslingObject<GoslingType.Bool>, "addr">;
        const addr = this.memory.allocBool(d.data);
        return { addr, ...d };
      }
      case GoslingType.Int: {
        const d = data as Omit<GoslingObject<GoslingType.Int>, "addr">;
        const addr = this.memory.allocInt(d.data);
        return { addr, ...d };
      }
      case GoslingType.String: {
        const d = data as Omit<GoslingObject<GoslingType.String>, "addr">;
        const addr = this.memory.allocString(d.data);

        return { addr, ...d };
      }
      case GoslingType.Lambda: {
        const d = data as Omit<GoslingObject<GoslingType.Lambda>, "addr">;
        const addr = this.memory.allocLambda(
          d.pcAddr,
          d.closure?.addr ?? HeapAddr.NULL
        );
        return { addr, ...d };
      }
      case GoslingType.Frame: {
        throw new Error("Not implemented");
        // const d = data as Omit<GoslingObject<GoslingType.Frame>, "addr">;
        // const addr = this.memory.allocFrame(
        //   d.parentEnv?.addr ?? HeapAddr.NULL,
        //   d.env?.addr ?? HeapAddr.NULL
        // );
        // return { addr, ...d };
      }
      case GoslingType.Value: {
        const d = data as Omit<GoslingObject<GoslingType.Value>, "addr">;
        const objAddr = d.obj?.addr ?? HeapAddr.NULL;
        const nextAddr = d.next?.addr ?? HeapAddr.NULL;
        const addr = this.memory.allocValue(objAddr, nextAddr);
        return { addr, ...d };
      }
      case GoslingType.Ptr: {
        const d = data as Omit<GoslingObject<GoslingType.Ptr>, "addr">;
        const objAddr = d.obj?.addr ?? HeapAddr.NULL;
        const addr = this.memory.allocHeapAddr(objAddr);
        return { addr, ...d };
      }
      default: {
        const _: never = data.type;
        throw new Error(`Invalid data: ${data}`);
      }
    }
  }

  private getHeapValue(addr: HeapAddr) {
    try {
      return this.memory.getHeapValue(addr).toHeapValue();
    } catch (e) {
      const bytes = this.memory.getHeapValueInBytes(addr);
      throw new Error(`Invalid heap value at ${addr}: [ ${bytes} ]`);
    }
  }
}
