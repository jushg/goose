import { AnyGoslingObject, assertGoslingType } from ".";
import {
  AnyInstructionObj,
  InstrAddr,
  OpCode,
  SysCallInstructionObj,
  assertOpType,
} from "../common/instructionObj";
import { ExecutionState } from "../common/state";
import { HeapAddr, HeapType } from "../memory";
import { GoslingMemoryManager } from "./memory";
import { ThreadControlObject } from "./threadControl";

type SysCall = ({
  ins,
  memory,
  thread,
}: {
  ins: AnyInstructionObj;
  memory: GoslingMemoryManager;
  thread: ThreadControlObject;
  es: ExecutionState;
}) => void;

const print: SysCall = ({ thread }) => {
  const arg: AnyGoslingObject = thread.getOS().pop();
  if (arg.type === HeapType.String) {
    thread.print(`'${arg.data}'`);
    return;
  } else if (arg.type === HeapType.Int) {
    thread.print(`${arg.data}`);
    return;
  } else if (arg.type === HeapType.Bool) {
    thread.print(`${arg.data}`);
    return;
  } else if (arg.type === HeapType.BinaryPtr) {
    thread.print(`${arg.child1.toString().slice(3)}`);
    return;
  }
};

const printOS: SysCall = ({ thread }) => {
  thread.print(`OS: ${thread.getOS().toString()}`);
};

const printHeap: SysCall = ({ memory, thread }) => {
  thread.print(`Heap: ${memory.toString()}`);
};

const done: SysCall = ({ thread, memory, es }) => {
  thread.setStatus("DONE");

  // // If the thread is the main thread, we need to stop the machine.
  // if (thread.isMain()) {
  //   for (const tId of memory.threadDataMap.keys()) {
  //     const t = memory.getThreadData(tId);
  //     if (t.status !== "DONE") {
  //       es.vmPrinter(
  //         { threadId: tId },
  //         `Thread ${tId} (${t.status}) terminated by main thread.`
  //       );
  //       memory.setThreadData(tId, { status: "DONE" });
  //     }
  //   }
  // }
};

const triggerBreakpoint: SysCall = ({ thread }) => {
  thread.setStatus("BREAKPOINT");
};

const make: SysCall = ({ ins, thread }) => {
  assertOpType(OpCode.SYS_CALL, ins);
  const { type } = ins;
  if (type === null) throw new Error("Type is null in make");

  const baseType = type.type.base;
  switch (baseType) {
    case "INT":
      thread.getOS().push({ type: HeapType.Int, data: 0 });
      return;
    case "STR":
      thread.getOS().push({ type: HeapType.String, data: "" });
      return;
    case "BOOL":
      thread.getOS().push({ type: HeapType.Bool, data: true });
      return;
    case "PTR":
      thread.getOS().push({
        type: HeapType.BinaryPtr,
        child1: HeapAddr.getNull(),
        child2: HeapAddr.getNull(),
      });
      return;
    case "CHAN":
      throw new Error("Channel type not implemented for 'make'");
    case "FUNC":
    case "NIL":
    case "ARRAY":
      throw new Error(`Cannot use 'make' on ${baseType}`);
    default:
      const _: never = baseType;
      throw new Error(`Unsupported type on 'make': ${type}`);
  }
};

const new_: SysCall = (args) => {
  make(args);
  const { thread } = args;
  const obj = thread.getOS().pop();
  thread.getOS().push({
    type: HeapType.BinaryPtr,
    child1: obj.addr,
    child2: HeapAddr.getNull(),
  });
};

const makeLambda: SysCall = ({ ins, memory, thread }) => {
  assertOpType(OpCode.SYS_CALL, ins);
  const { argCount } = ins;
  if (argCount !== 1) throw new Error("Invalid arg count for makeLambda");

  const rtsAddr = thread.getRTS().getTopScopeAddr();
  const pcAddr = thread.getOS().pop();
  assertGoslingType(HeapType.Int, pcAddr);
  const ptrToLambda = memory.allocLambda(
    rtsAddr,
    InstrAddr.fromNum(pcAddr.data)
  );

  thread.getOS().push(ptrToLambda);
};
const yield_: SysCall = ({ es }) => {
  es.machineState.TIME_SLICE = 0;
};

export const sysCallLogic = {
  make,
  done,
  new: new_,
  makeLambda,
  printOS,
  printHeap,
  triggerBreakpoint,
  print,
  yield: yield_,
} satisfies { [key in SysCallInstructionObj["sym"]]: SysCall };
