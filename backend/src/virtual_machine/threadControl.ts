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
  _id?: string
): ThreadControlObject {
  const id = (_id || "_") + Math.random().toString(36).substring(7);
  let pc = callee.pcAddr;
  let rts = callee.closure;

  let _os = memory.allocList(args.map((arg) => memory.alloc(arg).addr));
  const os: GoslingOperandStackObj = {
    push: (val: Literal<AnyGoslingObject>) => {
      const valueObj = memory.alloc(val);
      _os = memory.allocList([valueObj.addr], _os);
    },
    pop: () => {
      _os = memory.getList(_os.at(0)?.nodeAddr || HeapAddr.getNull());
      if (_os.length === 0) throw new Error("Operand stack is empty");

      const val = _os.at(0)!.value;
      if (val === null) throw new Error("Operand stack .top is null");
      _os = _os.slice(1);
      return val;
    },
    peek: () => {
      _os = memory.getList(_os.at(0)?.nodeAddr || HeapAddr.getNull());
      if (_os.length === 0) throw new Error("Operand stack is empty");

      const val = _os[0].value;
      if (val === null) throw new Error("Operand stack .top is null");
      return val;
    },
  };

  return {
    getId: () => id,
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
};
