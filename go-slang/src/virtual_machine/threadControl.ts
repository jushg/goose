import {
  AnyGoslingObject,
  GoslingLambdaObj,
  GoslingListObj,
  GoslingObject,
  Literal,
  assertGoslingType,
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
  onGarbageCollection(): void;
  getId(): string;
  getOS(): GoslingOperandStackObj;
  getRTS(): GoslingScopeObj;
  getPC(): InstrAddr;

  setPC(pc: InstrAddr): void;
  incrPC(): void;

  addFrame(decl: string[]): void;
  execFn(obj: GoslingLambdaObj, argCount: number): void;
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

  let _os = memory.getList(memory.getThreadData(id).os);
  const getRTS = () => memory.getEnvs(memory.getThreadData(id).rts);
  const getPC = () => memory.getThreadData(id).pc;
  const getStatus = () => memory.getThreadData(id).status;

  const os: GoslingOperandStackObj = {
    push: (val: Literal<AnyGoslingObject> | HeapAddr) => {
      const valueObj =
        val instanceof HeapAddr ? memory.get(val) : memory.alloc(val);

      if (valueObj === null)
        throw new Error("Value object for os.push() is null");
      _os = memory.allocList([valueObj.addr], _os);
      memory.setThreadData(id, { os: getOsAddr(_os) });
    },
    pop: () => {
      const val = os.peek();
      _os = _os.slice(1);
      memory.setThreadData(id, { os: getOsAddr(_os) });

      const result = memory.get(val.addr);
      if (result === null)
        throw new Error(
          `OS .pop() finds null from node ${JSON.stringify(val)}`
        );

      return result;
    },
    peek: () => {
      if (_os.length === 0) throw new Error("Operand stack is empty");

      const valNode = memory.get(_os.at(0)!.nodeAddr);
      assertGoslingType(HeapType.BinaryPtr, valNode);

      const val = memory.get(valNode.child2);
      if (val === null) throw new Error("Operand stack .top is null");

      const result = memory.get(val.addr);
      if (result === null)
        throw new Error(
          `OS .peek() finds null from node ${JSON.stringify(val)}`
        );

      return result;
    },
    getLength: () => {
      return _os.length;
    },
    toString: () => {
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
        `OS(${_os.length}): [\n` +
        `${_os.map((n) => getValueFromValueListPtr(n.nodeAddr)).join(", ")}` +
        `\n]`
      );
    },
  };

  const t: ThreadControlObject = {
    onGarbageCollection: () => {
      _os = memory.getList(memory.getThreadData(id).os);
      // rts is anyway queried on demand
    },
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
    execFn: (f, argCount) => {
      let rts = getRTS();
      const osAddr = memory.getThreadData(id).os;
      const newOsAddr = argCount === 0 ? HeapAddr.getNull() : osAddr;
      let lastOfNewOs: HeapAddr | null = null;
      let osToRestore = osAddr;

      // Find the OS address to preserve (after the arg list)
      for (let i = 0; i < argCount; i++) {
        lastOfNewOs = osToRestore;
        const curr = memory.get(osToRestore);
        assertGoslingType(HeapType.BinaryPtr, curr);
        osToRestore = curr.child1;
      }

      if (lastOfNewOs) {
        const last = memory.get(lastOfNewOs);
        assertGoslingType(HeapType.BinaryPtr, last);
        memory.set(lastOfNewOs, {
          type: HeapType.BinaryPtr,
          child1: HeapAddr.getNull(), // Cut off the OS after the arg list.
          child2: last.child2,
        });
      }

      _os = memory.getList(newOsAddr);
      rts = memory.allocNewCallFrame({
        callerPC: getPC(),
        callerRTS: rts,
        postCallOsAddr: osToRestore,
        lambdaClosure: f.closure.getTopScopeAddr(),
      });
      memory.setThreadData(id, {
        pc: f.pcAddr,
        rts: rts.getTopScopeAddr(),
        os: newOsAddr,
      });
    },
    execFor: () => {
      let continueRTS = getRTS();
      const rts = memory.allocNewForFrame({
        continuePC: t.getPC(),
        continueRTS,
      });
      memory.setThreadData(id, { rts: rts.getTopScopeAddr() });
    },
    exitFrame: () => {
      const enclosing = memory.getEnclosingFrame(getRTS());
      memory.setThreadData(id, { rts: enclosing.getTopScopeAddr() });
    },
    exitSpecialFrame: (label) => {
      const {
        pc,
        rts,
        os: osToRestore,
      } = memory.getEnclosingSpecialFrame(getRTS(), label);
      let currOsAddr = memory.getThreadData(id).os;

      // Attach return value if there is one
      if (currOsAddr.isNull()) {
        currOsAddr = osToRestore;
      } else {
        const node = memory.get(currOsAddr);
        assertGoslingType(HeapType.BinaryPtr, node);
        if (!node.child1.isNull()) {
          throw new Error(
            "Cannot exit a special frame with > 1 item in OS " +
              JSON.stringify(
                memory.getList(currOsAddr).map((a) => memory.get(a.nodeAddr))
              )
          );
        }
        memory.set(currOsAddr, {
          type: HeapType.BinaryPtr,
          child1: osToRestore,
          child2: node.child2,
        });
      }
      memory.setThreadData(id, { pc, rts, os: currOsAddr });
      _os = memory.getList(currOsAddr);
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
  getLength(): number;
};
