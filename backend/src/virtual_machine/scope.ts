import { HeapAddr, HeapType } from "../memory";
import { GoslingMemoryManager } from "./alloc";
import { AnyGoslingObject, GoslingBinaryPtrObj, Literal } from "./memory";
import { assertGoslingType, isGoslingType } from ".";

export type GoslingScopeObj = {
  lookup(symbol: string): AnyGoslingObject | null;
  assign(symbol: string, val: Literal<AnyGoslingObject>): void;
  getEnclosingScope(): GoslingScopeObj;
  allocNewFrame(
    symbolAndValues: Record<string, Literal<AnyGoslingObject>>
  ): GoslingScopeObj;
  getTopScopeAddr(): HeapAddr;
};

export type GoslingScopeData = {
  addr: HeapAddr;
  envs: {
    envsListPtr: HeapAddr;
    env: Record<
      string,
      {
        symbolListPtr: HeapAddr;
        valueListPtr: HeapAddr;
        valueObj: AnyGoslingObject;
      }
    >;
  }[];
};

export function readScopeData(
  addr: HeapAddr,
  memory: GoslingMemoryManager
): GoslingScopeData {
  const envs = memory.getList(addr).map((v, idx) => {
    const envPtr = v.val;
    if (envPtr === null || !isGoslingType(HeapType.BinaryPtr, envPtr))
      throw new Error(`Non-ptr in env list at ${addr}:${idx}=${envPtr?.addr}`);

    try {
      const env = getEnv(envPtr.addr, memory);
      return { envsListPtr: v.ptr, env };
    } catch (e) {
      throw new Error(`Invalid env (env list at ${addr}:${idx}): ${e}`);
    }
  });

  return { addr, envs };
}

export function getScopeObj(
  scopeData: GoslingScopeData,
  memory: GoslingMemoryManager
): GoslingScopeObj {
  const { envs, addr } = scopeData;
  const start = addr;
  return {
    lookup: (symbol: string) => {
      for (const { env } of envs) {
        if (symbol in env) {
          return env[symbol].valueObj;
        }
      }
      throw new Error(`Symbol ${symbol} not found in envs at ${start}`);
    },

    assign: (symbol: string, val: Literal<AnyGoslingObject>) => {
      for (const { env } of envs) {
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
      throw new Error(`Symbol ${symbol} not found in envs at ${start}`);
    },

    allocNewFrame: (
      symbolAndValues: Record<string, Literal<AnyGoslingObject>>
    ) => {
      if (Object.keys(symbolAndValues).length === 0) {
        return memory.getEnvs(start);
      }

      const envKeyValueList = Object.keys(symbolAndValues).flatMap((s) => {
        const symbolStr = memory.alloc({ type: HeapType.String, data: s });
        const value = memory.alloc(symbolAndValues[s]);
        return [symbolStr.addr, value.addr];
      });

      const env = memory.allocList(envKeyValueList);
      const newFrameAddr = memory.allocList([env], start);

      return memory.getEnvs(newFrameAddr);
    },

    getTopScopeAddr: () => start,

    getEnclosingScope: () => {
      if (envs.length < 2)
        throw new Error(
          `Trying to exit scope from ${start} (envs of len ${envs.length})`
        );

      return memory.getEnvs((memory.get(start) as GoslingBinaryPtrObj).child1);
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
