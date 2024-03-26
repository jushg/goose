import { AnyGoslingObject, GoslingLambdaObj, Literal } from "./memory";
import { assertGoslingType } from ".";
import { GoslingScopeObj } from "./scope";

import { InstrAddr } from "../instruction/base";
import { GoslingMemoryManager } from "./alloc";
import { HeapAddr, HeapType } from "../memory";

export type ThreadControlObject = {
  getId(): string;
  getOS(): GoslingOperandStackObj;
  getRTS(): GoslingScopeObj;
  getPC(): InstrAddr;
  setPC(pc: InstrAddr): void;
};

export function createThreadControlObject(
  callee: GoslingLambdaObj,
  args: Literal<AnyGoslingObject>[],
  memory: GoslingMemoryManager,
  id?: string
): ThreadControlObject {
  let _id = (id || "_") + Math.random().toString(36).substring(7);
  let pc = callee.pcAddr;
  let osAddr = memory.allocList(args.map((arg) => memory.alloc(arg).addr));
  let rts = callee.closure;

  const os: GoslingOperandStackObj = {
    push: (val: Literal<AnyGoslingObject>) => {
      osAddr = memory.alloc(val).addr;
    },
    pop: () => {
      const val = memory.get(osAddr);
      if (val === null) throw new Error("Operand stack is empty");
      assertGoslingType(HeapType.BinaryPtr, val);
      osAddr = val.child1;
      return val;
    },
    peek: () => {
      const val = memory.get(osAddr);
      if (val === null) throw new Error("Operand stack is empty");
      return val;
    },
    getTopAddr: () => osAddr,
  };

  return {
    getId: () => _id,
    getOS: () => os,
    getRTS: () => rts,
    getPC: () => pc,
    setPC: (newPC: InstrAddr) => (pc = newPC),
  };
}
export type GoslingOperandStackObj = {
  push(val: Literal<AnyGoslingObject>): void;
  pop(): Literal<AnyGoslingObject>;
  peek(): Literal<AnyGoslingObject>;
  getTopAddr(): HeapAddr;
};
