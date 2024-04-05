import {
  AnyGoslingObject,
  GoslingListObj,
  Literal,
  assertGoslingType,
  isGoslingType,
} from ".";
import { HeapAddr, HeapType } from "../memory";
import { GoslingMemoryManager } from "./memory";

export type GoslingScopeObj = {
  lookup(symbol: string): AnyGoslingObject | null;
  assign(symbol: string, val: Literal<AnyGoslingObject>): void;
  getTopScopeAddr(): HeapAddr;
  getScopeData(): GoslingScopeData;
  toString(): string;
};

export type GoslingScopeData = (GoslingListObj[number] & {
  env: Record<
    string,
    {
      symbolListPtr: HeapAddr;
      valueListPtr: HeapAddr;
      valueObj: AnyGoslingObject | null;
    }
  >;
})[];

export function readScopeData(
  addr: HeapAddr,
  memory: GoslingMemoryManager
): GoslingScopeData {
  const envs = memory.getList(addr).map(({ nodeAddr, value, node }, idx) => {
    if (value === null) return { nodeAddr, node, value, env: {} };
    if (!isGoslingType(HeapType.BinaryPtr, value))
      throw new Error(`Non-ptr in env list at ${addr}:${idx}=${value?.addr}`);

    try {
      const env = getEnv(value.addr, memory);
      return { nodeAddr, node, value, env };
    } catch (e) {
      throw new Error(`Invalid env (env list at ${addr}:${idx}): ${e}`);
    }
  });

  return envs;
}

export function getScopeObj(
  scopeData: GoslingScopeData,
  memory: GoslingMemoryManager
): GoslingScopeObj {
  const start = scopeData.at(0)?.nodeAddr || HeapAddr.getNull();
  const getScopeData = () => readScopeData(start, memory);
  const toString = () => `[ ${getScopeData().map(scopeToString)} ]`;

  return {
    toString,
    getScopeData,
    getTopScopeAddr: () => start,

    lookup: (symbol: string) => {
      for (const envNode of getScopeData()) {
        const { env } = envNode;
        if (symbol in env) {
          return env[symbol].valueObj;
        }
      }
      throw new Error(
        `Symbol ${symbol} not found in envs at ${start}: ${toString()}`
      );
    },

    assign: (symbol: string, val: Literal<AnyGoslingObject>) => {
      for (const envNode of getScopeData()) {
        const { env } = envNode;
        if (symbol in env) {
          const { valueListPtr } = env[symbol];
          const valueListItem = memory.get(valueListPtr)!;
          assertGoslingType(HeapType.BinaryPtr, valueListItem);

          env[symbol].valueObj = memory.alloc(val);
          memory.set(valueListItem.addr, {
            ...valueListItem,
            child2: env[symbol].valueObj!.addr,
          });

          return;
        }
      }
      throw new Error(
        `Symbol ${symbol} not found in envs at ${start}: ${toString()}`
      );
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
      valueObj: AnyGoslingObject | null;
    }
  > = {};
  if (list.length % 2 !== 0) {
    throw new Error(`Invalid env list at ${addr} of length ${list.length}`);
  }

  for (let i = 0; i < list.length; i += 2) {
    const keyListItem = list[i];
    const valListItem = list[i + 1];
    const key = keyListItem.value;

    if (key === null) throw new Error(`Invalid key at ${i / 2} in env ${addr}`);
    assertGoslingType(HeapType.String, key);

    env[key.data] = {
      symbolListPtr: keyListItem.nodeAddr,
      valueListPtr: valListItem.nodeAddr,
      valueObj: valListItem.value,
    };
  }

  return env;
}

export function scopeToString({ env }: GoslingScopeData[number]): string {
  return (
    "{\n" +
    Object.keys(env)
      .map(
        (symbol) =>
          `  ${symbol}:\n` +
          `    &sym=${env[symbol].symbolListPtr}\n` +
          `    &val=${env[symbol].valueListPtr}\n` +
          `    val=${JSON.stringify(env[symbol].valueObj)}`
      )
      .join("\n") +
    "\n}"
  );
}
