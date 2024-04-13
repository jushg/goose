import {
  AnyGoslingObject,
  GoslingLambdaObj,
  GoslingListObj,
  GoslingObject,
  Literal,
} from ".";
import { GoslingScopeObj } from "./scope";

import { InstrAddr } from "../common/instructionObj";
import { HeapAddr, HeapType } from "../memory";
import { GoslingMemoryManager, SpecialFrameLabels, ThreadData } from "./memory";

export type ThreadStatus =
  | "DONE"
  | "RUNNABLE"
  | "BREAKPOINT"
  | "TIME_SLICE_EXCEEDED";

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

  setStatus(status: ThreadStatus): void;
  getStatus(): ThreadStatus;
};

let _id = 0;

function getOsAddr(l: GoslingListObj): HeapAddr {
  return l.at(0)?.nodeAddr || HeapAddr.getNull();
}

export function createThreadControlObject(
  memory: GoslingMemoryManager,
  printer: (a: { threadId: string }, s: string) => void,
  initData: ThreadData = {
    pc: InstrAddr.fromNum(0),
    rts: HeapAddr.getNull(),
    os: HeapAddr.getNull(),
    status: "RUNNABLE",
  }
): ThreadControlObject {
  const id = `t_${(++_id).toString(16).padStart(5, "0")}__from${initData.pc.addr.toString().padStart(6, "_")}`;
  memory.allocThreadData(id, initData);

  const getOS = () => memory.getList(memory.getThreadData(id).os);
  const getRTS = () => memory.getEnvs(memory.getThreadData(id).rts);
  const getPC = () => memory.getThreadData(id).pc;
  const getStatus = () => memory.getThreadData(id).status;

  const os: GoslingOperandStackObj = {
    push: (val: Literal<AnyGoslingObject> | HeapAddr) => {
      let _os = getOS();
      const valueObj =
        val instanceof HeapAddr ? memory.get(val) : memory.alloc(val);

      if (valueObj === null)
        throw new Error("Value object for os.push() is null");
      _os = memory.allocList([valueObj.addr], _os);
      memory.setThreadData(id, { os: getOsAddr(_os) });
    },
    pop: () => {
      const val = os.peek();
      const _os = getOS();
      memory.setThreadData(id, { os: getOsAddr(_os.slice(1)) });

      const result = memory.get(val.addr);
      if (result === null)
        throw new Error(
          `OS .pop() finds null from node ${JSON.stringify(val)}`
        );

      return result;
    },
    peek: () => {
      const _os = getOS();
      if (_os.length === 0) throw new Error("Operand stack is empty");

      const val = _os.at(0)!.value;
      if (val === null) throw new Error("Operand stack .top is null");

      const result = memory.get(val.addr);
      if (result === null)
        throw new Error(
          `OS .peek() finds null from node ${JSON.stringify(val)}`
        );

      return result;
    },
    length: () => {
      const _os = getOS();
      return _os.length;
    },
    toString: () => {
      const _os = getOS();
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
    getRTS,
    getPC,
    setPC: (newPC: InstrAddr) => memory.setThreadData(id, { pc: newPC }),
    incrPC: () => {
      const pc = getPC();
      memory.setThreadData(id, { pc: InstrAddr.fromNum(pc.addr + 1) });
    },
    addFrame: (f) =>
      memory.setThreadData(id, {
        rts: memory.allocNewFrame(getRTS(), f).getTopScopeAddr(),
      }),
    execFn: (f) => {
      let rts = getRTS();
      rts = memory.allocNewCallFrame(getPC(), rts, f.closure.getTopScopeAddr());
      memory.setThreadData(id, { rts: rts.getTopScopeAddr(), pc: f.pcAddr });
    },
    execFor: () => {
      let rts = getRTS();
      rts = memory.allocNewSpecialFrame(
        t.getPC(),
        rts,
        "FOR",
        rts.getTopScopeAddr()
      );
      memory.setThreadData(id, { rts: rts.getTopScopeAddr() });
    },
    exitFrame: () => {
      const enclosing = memory.getEnclosingFrame(getRTS());
      memory.setThreadData(id, { rts: enclosing.getTopScopeAddr() });
    },
    exitSpecialFrame: (label) => {
      const { pc, rts: newRTS } = memory.getEnclosingSpecialFrame(
        getRTS(),
        label
      );
      memory.setThreadData(id, { rts: newRTS.getTopScopeAddr(), pc });
    },
    setStatus: (status) => memory.setThreadData(id, { status }),
    getStatus,
    print: (s) => printer({ threadId: id }, s),
  };
  return t;
}

export type GoslingLitOrObj<T extends HeapType = HeapType> =
  | Literal<GoslingObject<T>>
  | GoslingObject<T>;

export function equalsAsGoslingLiterals(
  a: Literal<AnyGoslingObject>,
  b: Literal<AnyGoslingObject>
): boolean {
  if (a.type === HeapType.Int)
    return b.type === HeapType.Int && a.data === b.data;
  if (a.type === HeapType.Bool)
    return b.type === HeapType.Bool && a.data === b.data;
  if (a.type === HeapType.String)
    return b.type === HeapType.String && a.data === b.data;
  if (a.type === HeapType.BinaryPtr)
    return (
      b.type === HeapType.BinaryPtr &&
      a.child1.equals(b.child1) &&
      a.child2.equals(b.child2)
    );
  const _: never = a;
  throw new Error(`Unhandled type in equalsAsGoslingLiterals: ${a}`);
}

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
