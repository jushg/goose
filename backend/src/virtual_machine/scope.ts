import {
  AnyGoslingObject,
  GoslingScopeObj,
  IGoslingMemoryManager,
  Literal,
  assertGoslingType,
  isGoslingType,
} from "./memory";
import { GoslingMemoryManager } from "./alloc";
import { HeapAddr, HeapType } from "../memory";

export type GoslingScopeData = {
  ptr: HeapAddr;
  env: Record<
    string,
    {
      symbolListPtr: HeapAddr;
      valueListPtr: HeapAddr;
      valueObj: AnyGoslingObject;
    }
  >;
}[];

export function readScopeData(
  addr: HeapAddr,
  memory: GoslingMemoryManager
): GoslingScopeData {
  const envs = memory.getList(addr).map((v, idx) => {
    const val = v.val;
    if (val === null || !isGoslingType(HeapType.BinaryPtr, val))
      throw new Error(`Non-ptr in env list at ${addr}:${idx}`);

    const ptr = val.child2;
    try {
      const env = getEnv(ptr, memory);
      return { ptr, env };
    } catch (e) {
      throw new Error(`Invalid env (env list at ${addr}:${idx}): ${e}`);
    }
  });

  return envs;
}

export function getScopeObj(
  envs: GoslingScopeData,
  memory: GoslingMemoryManager
): GoslingScopeObj {
  return {
    lookup: (symbol: string) => {
      for (const { env } of envs) {
        if (symbol in env.values) {
          return env[symbol].valueObj;
        }
      }
      throw new Error(`Symbol ${symbol} not found in envs at ${envs[0].ptr}`);
    },

    assign: (symbol: string, val: Literal<AnyGoslingObject>) => {
      for (const { env, ptr } of envs) {
        if (symbol in env.values) {
          const { valueListPtr } = env[symbol];
          const valueListItem = memory.get(valueListPtr)!;
          assertGoslingType(HeapType.BinaryPtr, valueListItem);

          memory.set(valueListItem.addr, {
            ...valueListItem,
            child2: memory.alloc(val).addr,
          });

          return;
        }
      }
      throw new Error(`Symbol ${symbol} not found in envs at ${envs[0].ptr}`);
    },

    allocNewFrame: (symbols: string[]) => {
      const envKeyValueList = symbols
        .map((s) => memory.alloc({ type: HeapType.String, data: s }))
        .flatMap((symbolAddr) => [
          symbolAddr.addr,
          /* address to unassigned value */ HeapAddr.getNull(),
        ]);
      const env = memory.allocList(envKeyValueList, HeapAddr.getNull());
      const newFrameAddr = memory.allocList([env], envs[0].ptr);
      return memory.getEnvs(newFrameAddr);
    },

    getTopScopeAddr: () => envs[0].ptr,

    getEnclosingScopeAddr: () => {
      if (envs.length < 2)
        throw new Error(
          `Trying to exit scope from ${envs[0].ptr} (envs of len ${envs.length})`
        );

      return memory.getEnvs(envs[1].ptr);
    },
  };
}

function getEnv(addr: HeapAddr, memory: GoslingMemoryManager) {
  const list = memory.getList(addr);
  const env: Record<
    string,
    {
      symbolListPtr: HeapAddr;
      valueListPtr: HeapAddr;
      valueObj: AnyGoslingObject;
    }
  > = {};
  if (list.length % 2 !== 0) {
    throw new Error(`Invalid env list at ${addr} of length ${list.length}`);
  }

  for (let i = 0; i < list.length; i += 2) {
    const keyListItem = list[i];
    const valListItem = list[i + 1];
    const key = keyListItem.val;

    if (key === null) throw new Error(`Invalid key at ${i / 2} in env ${addr}`);
    assertGoslingType(HeapType.String, key);

    env[key.data] = {
      symbolListPtr: keyListItem.ptr,
      valueListPtr: valListItem.ptr,
      valueObj: valListItem.val,
    };
  }

  return env;
}
