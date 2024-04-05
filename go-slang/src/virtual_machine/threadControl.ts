import { AnyGoslingObject, GoslingLambdaObj, GoslingObject, Literal } from ".";
import { GoslingScopeObj } from "./scope";

import { InstrAddr } from "../common/instructionObj";
import { HeapAddr, HeapType } from "../memory";
import { GoslingMemoryManager, SpecialFrameLabels } from "./memory";

export type ThreadControlObject = {
  getId(): string;
  getOS(): GoslingOperandStackObj;
  getRTS(): GoslingScopeObj;
  getPC(): InstrAddr;

  setPC(pc: InstrAddr): void;
  incrPC(): void;

  addFrame(decl: string[]): void;
  execFn(obj: GoslingLambdaObj): void;
  execFor(): void;

  print(s: string): void;

  exitFrame(): void;
  exitSpecialFrame(label: SpecialFrameLabels): void;

  setStatus(status: "DONE" | "RUNNABLE" | "BREAKPOINT"): void;
  getStatus(): "DONE" | "RUNNABLE" | "BREAKPOINT";
};

let _id = 0;

export function createThreadControlObject(
  memory: GoslingMemoryManager,
  printer: (threadId: string, s: string) => void,
  caller?: { call: GoslingLambdaObj; args: Literal<AnyGoslingObject>[] }
): ThreadControlObject {
  const id = `${++_id}_` + Math.random().toString(36).substring(7);
  let pc = InstrAddr.fromNum(0);
  let rts = memory.getEnvs(HeapAddr.getNull());
  let _os = memory.allocList([]);
  let _status: "DONE" | "RUNNABLE" | "BREAKPOINT" = "RUNNABLE";

  if (caller) {
    pc = caller.call.pcAddr;
    rts = caller.call.closure;
    _os = memory.allocList(caller.args.map((arg) => memory.alloc(arg).addr));
  }

  const os: GoslingOperandStackObj = {
    push: (val: Literal<AnyGoslingObject> | HeapAddr) => {
      _os = memory.getList(_os.at(0)?.nodeAddr || HeapAddr.getNull());
      const valueObj =
        val instanceof HeapAddr ? memory.get(val) : memory.alloc(val);

      if (valueObj === null)
        throw new Error("Value object for os.push() is null");
      _os = memory.allocList([valueObj.addr], _os);
    },
    pop: () => {
      const val = os.peek();
      _os.pop();
      return val;
    },
    peek: () => {
      _os = memory.getList(_os.at(0)?.nodeAddr || HeapAddr.getNull());
      if (_os.length === 0) throw new Error("Operand stack is empty");

      const val = _os.at(0)!.value;
      if (val === null) throw new Error("Operand stack .top is null");
      return val;
    },
    length: () => {
      _os = memory.getList(_os.at(0)?.nodeAddr || HeapAddr.getNull());
      return _os.length;
    },
    toString: () => {
      _os = memory.getList(_os.at(0)?.nodeAddr || HeapAddr.getNull());
      return (
        `OS(${_os.length}): [\n` +
        `${_os
          .map((n) => JSON.stringify(n.value, undefined, "  "))
          .join(", ")}` +
        `\n]`
      );
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
      rts = memory.allocNewCallFrame(pc, rts, f.closure.getTopScopeAddr());
      t.setPC(f.pcAddr);
    },
    execFor: () => {
      rts = memory.allocNewSpecialFrame(
        t.getPC(),
        rts,
        "FOR",
        rts.getTopScopeAddr()
      );
    },
    exitFrame: () => {
      const enclosing = memory.getEnclosingFrame(rts);
      rts = enclosing;
    },
    exitSpecialFrame: (label) => {
      const { pc, rts: newRTS } = memory.getEnclosingSpecialFrame(rts, label);
      t.setPC(pc);
      rts = newRTS;
    },
    setStatus: (status) => (_status = status),
    getStatus: () => _status,
    print: (s) => printer(id, s),
  };
  return t;
}

export type GoslingLitOrObj<T extends HeapType = HeapType> =
  | Literal<GoslingObject<T>>
  | GoslingObject<T>;

export function isGoslingObject<T extends HeapType = HeapType>(
  obj: GoslingLitOrObj<T>
): obj is GoslingObject<T> {
  return "addr" in obj;
}

export function assertGoslingObject<T extends HeapType = HeapType>(
  obj: GoslingLitOrObj<T>
): asserts obj is GoslingObject<T> {
  if (!isGoslingObject(obj)) {
    throw new Error(`Expected gosling obj, but not: ${obj}`);
  }
}

export type GoslingOperandStackObj = {
  push(val: Literal<AnyGoslingObject> | HeapAddr): void;
  pop(): AnyGoslingObject;
  peek(): AnyGoslingObject;
  toString(): string;
  length(): number;
};
