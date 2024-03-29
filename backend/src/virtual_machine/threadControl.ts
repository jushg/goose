import { AnyGoslingObject, GoslingLambdaObj, Literal } from ".";
import { GoslingScopeObj } from "./scope";

import { InstrAddr } from "../instruction/base";
import { HeapAddr } from "../memory";
import { GoslingMemoryManager } from "./memory";

export type ThreadControlObject = {
  getId(): string;
  getOS(): GoslingOperandStackObj;
  getRTS(): GoslingScopeObj;
  getPC(): InstrAddr;

  setPC(pc: InstrAddr): void;
  incrPC(): void;

  addFrame(decl: Record<string, Literal<AnyGoslingObject>>): void;
  execFn(obj: GoslingLambdaObj): void;

  // Note that this will set PC to the caller's PC if applicable.
  // This means whether it exits a fn call or is a normal scope, you must
  // increment PC by 1 after this.
  exitFrame(): void;
};

let _id = 0;

export function createThreadControlObject(
  memory: GoslingMemoryManager,
  caller?: { call: GoslingLambdaObj; args: Literal<AnyGoslingObject>[] }
): ThreadControlObject {
  const id = `${++_id}_` + Math.random().toString(36).substring(7);
  let pc = InstrAddr.fromNum(0);
  let rts = memory.getEnvs(HeapAddr.getNull());
  let _os = memory.allocList([]);

  if (caller) {
    pc = caller.call.pcAddr;
    rts = caller.call.closure;
    _os = memory.allocList(caller.args.map((arg) => memory.alloc(arg).addr));
  }

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

  const t: ThreadControlObject = {
    getId: () => id,
    getOS: () => os,
    getRTS: () => rts,
    getPC: () => pc,
    setPC: (newPC: InstrAddr) => (pc = newPC),
    incrPC: () => (pc = InstrAddr.fromNum(pc.addr + 1)),
    addFrame: (f) => (rts = memory.allocNewFrame(rts, f)),
    execFn: (f) => {
      rts = memory.allocNewJumpFrame(pc, rts, f.closure.getTopScopeAddr());
      t.setPC(f.pcAddr);
    },
    exitFrame: () => {
      const { callerPC, enclosing } = memory.getEnclosingFrame(rts);
      if (callerPC !== null) t.setPC(callerPC);
      rts = enclosing;
    },
  };
  return t;
}
export type GoslingOperandStackObj = {
  push(val: Literal<AnyGoslingObject>): void;
  pop(): Literal<AnyGoslingObject>;
  peek(): Literal<AnyGoslingObject>;
};
