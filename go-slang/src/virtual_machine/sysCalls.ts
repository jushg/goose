import { AnyGoslingObject } from ".";
import {
  AnyInstructionObj,
  OpCode,
  SysCallInstructionObj,
  assertOpType,
} from "../common/instructionObj";
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
}) => void;

const printOsTop: SysCall = ({ memory, thread }) => {
  const arg: AnyGoslingObject = thread.getOS().peek();
  const inner = Object.keys(arg)
    .filter((key) => !(key === "type" || key === "addr"))
    .map((key) => `${key}: ${(arg as any)[key]}`)
    .join(", ");
  thread.print(`${arg.type} @ ${arg.addr.toString()}: { ${inner} }`);
};

const printOS: SysCall = ({ thread }) => {
  thread.print(`OS: ${thread.getOS().toString()}`);
};

const printHeap: SysCall = ({ memory, thread }) => {
  thread.print(`Heap: ${memory.toString()}`);
};

const done: SysCall = ({ thread }) => {
  thread.setStatus("DONE");
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

const new_: SysCall = ({ ins, memory, thread }) => {
  make({ ins, memory, thread });
  const obj = thread.getOS().pop();
  thread.getOS().push({
    type: HeapType.BinaryPtr,
    child1: obj.addr,
    child2: HeapAddr.getNull(),
  });
};

export const sysCallLogic = {
  make,
  done,
  printOS,
  printHeap,
  triggerBreakpoint,
  new: new_,
} satisfies { [key in SysCallInstructionObj["sym"]]: SysCall };
