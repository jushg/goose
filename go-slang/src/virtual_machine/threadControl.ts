import { AnyGoslingObject, GoslingLambdaObj, GoslingObject, Literal } from ".";
import { GoslingScopeObj } from "./scope";

import { InstrAddr } from "../common/instructionObj";
import { HeapType } from "../memory";
import { GoslingMemoryManager, SpecialFrameLabels } from "./memory";
import { GoslingOperandStackObj } from "./operandStack";

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

export function createThreadControlObject(
  memory: GoslingMemoryManager,
  printer: (threadId: string, s: string) => void,
  caller?: { call: GoslingLambdaObj; args: Literal<AnyGoslingObject>[] }
): ThreadControlObject {
  const id = `${++_id}_` + Math.random().toString(36).substring(7);
  let pc = InstrAddr.fromNum(0);
  if (caller) {
    pc = caller.call.pcAddr;
  }

  let threadMemoryAddr = memory.allocThreadMemory(caller);
  let getMemoryRTS = () => {
    return memory.getRTS(threadMemoryAddr);
  };
  let getMemoryOS = () => {
    return memory.getOS(threadMemoryAddr);
  };

  let _status: ThreadStatus = "RUNNABLE";

  const t: ThreadControlObject = {
    getId: () => id,
    getOS: () => getMemoryOS(),
    getRTS: () => getMemoryRTS(),
    getPC: () => pc,
    setPC: (newPC: InstrAddr) => (pc = newPC),
    incrPC: () => (pc = InstrAddr.fromNum(pc.addr + 1)),
    addFrame: (f) => {
      let newFrame = memory.allocNewFrame(getMemoryRTS(), f);
      memory.setRTS(threadMemoryAddr, newFrame.getTopScopeAddr());
    },
    execFn: (f) => {
      let newFrame = memory.allocNewCallFrame(
        pc,
        getMemoryRTS(),
        f.closure.getTopScopeAddr()
      );
      memory.setRTS(threadMemoryAddr, newFrame.getTopScopeAddr());
      t.setPC(f.pcAddr);
    },
    execFor: () => {
      let newFrame = memory.allocNewSpecialFrame(
        t.getPC(),
        getMemoryRTS(),
        "FOR",
        getMemoryRTS().getTopScopeAddr()
      );
      memory.setRTS(threadMemoryAddr, newFrame.getTopScopeAddr());
    },
    exitFrame: () => {
      const enclosing = memory.getEnclosingFrame(getMemoryRTS());
      memory.setRTS(threadMemoryAddr, enclosing.getTopScopeAddr());
    },
    exitSpecialFrame: (label) => {
      const { pc, rts: newRTS } = memory.getEnclosingSpecialFrame(
        getMemoryRTS(),
        label
      );
      t.setPC(pc);
      memory.setRTS(threadMemoryAddr, newRTS.getTopScopeAddr());
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
