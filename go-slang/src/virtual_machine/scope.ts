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
  const toString = () =>
    `[ ${scopeData.map((i) => scopeToString(i, memory))} ]`;

  return {
    toString,
    getScopeData: () => scopeData,
    getTopScopeAddr: () => start,

    lookup: (symbol: string) => {
      for (const envNode of scopeData) {
        const { env } = envNode;
        if (symbol in env) {
          const valueNode = memory.get(env[symbol].valueListPtr);
          if (valueNode === null)
            throw new Error(`Value node is null for ${symbol}`);

          assertGoslingType(HeapType.BinaryPtr, valueNode);
          return memory.get(valueNode.child2);
        }
      }
      throw new Error(
        `Symbol ${symbol} not found in envs at ${start}: ${toString()}`
      );
    },

    assign: (symbol: string, val: Literal<AnyGoslingObject>) => {
      for (const envNode of scopeData) {
        const { env } = envNode;
        if (symbol in env) {
          const { valueListPtr } = env[symbol];
          const valueListItem = memory.get(valueListPtr)!;
          assertGoslingType(HeapType.BinaryPtr, valueListItem);

          const newAddr = memory.alloc(val).addr;
          memory.set(valueListItem.addr, {
            ...valueListItem,
            child2: newAddr,
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
    };
  }

  return env;
}

export function scopeToString(
  { env }: GoslingScopeData[number],
  memory: GoslingMemoryManager
): string {
  const getValueFromValueListPtr = (ptr: HeapAddr) => {
    try {
      const valueListItem = memory.get(ptr);
      if (valueListItem === null) return "*(null)";

      assertGoslingType(HeapType.BinaryPtr, valueListItem);
      return JSON.stringify(memory.get(valueListItem.child2));
    } catch (e) {
      return `(error: ${e})`;
    }
  };
  return (
    "{\n" +
    Object.keys(env)
      .map(
        (symbol) =>
          `  ${symbol}:\n` +
          `    &sym=${env[symbol].symbolListPtr}\n` +
          `    &val=${env[symbol].valueListPtr}\n` +
          `    val=${getValueFromValueListPtr(env[symbol].valueListPtr)}`
      )
      .join("\n") +
    "\n}"
  );
}
