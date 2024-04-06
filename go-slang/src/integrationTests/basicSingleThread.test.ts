import { OpCode } from "../common/instructionObj";
import { compileParsedProgram } from "../compiler";
import { HeapAddr, HeapInBytes, HeapType } from "../memory";
import { parse } from "../parser";
import {
  AnyGoslingObject,
  executeStep,
  initializeVirtualMachine,
} from "../virtual_machine";
import { GoslingMemoryManager } from "../virtual_machine/memory";

function getMemResidency(memory: GoslingMemoryManager) {
  if (memory === undefined) throw new Error("Memory is undefined");

  const visited: HeapAddr[] = [];
  const roots = memory
    .getMemoryRoots()
    .filter((r) => !r.isNull())
    .map((a) => memory.get(a))
    .map((x) => x!);

  while (roots.length > 0) {
    const root = roots.pop()!;
    visited.push(root.addr);

    const newAdd: HeapAddr[] = [];

    switch (root.type) {
      case HeapType.BinaryPtr: {
        newAdd.push(root.child1);
        newAdd.push(root.child2);
        break;
      }
      case HeapType.String: {
        const strAsHeapVal = memory.memory
          .getHeapValue(root.addr)
          .toHeapValue();
        if (strAsHeapVal.type !== HeapType.String)
          throw new Error("Expected string type in mem residency check");
        newAdd.push(strAsHeapVal.next);
      }
      case HeapType.Int:
      case HeapType.Bool:
        break;
      default:
        const _: never = root;
        throw new Error(`Unexpected heap type: ${root}`);
    }

    newAdd.forEach((addr) => {
      if (!addr.isNull() && !visited.find((a) => a.equals(addr))) {
        const node = memory.get(addr);
        if (node) roots.push(node);
      }
    });
  }

  return visited.length;
}

const progStr = `
var x int

func main() {
  var bar string
  var baz int
  innerFn := func () {
    baz = 1
  }
  bar = "BAR1"
  innerFn()
  foo(1)
  bar = "BAR2"
}

func foo(y int) {
  var baz string
  var bay string
  x = x + y
  if x < 4 {
    print(x)
    foo(y * 2)
  }
  print(x < x)

  for i := 0; i < 3; i = i + 1 {
    bay = bay + "BAY"
  }
  print(bay)
  print(&bay)
}
`;

describe("basic single threaded program", () => {
  it("should execute correctly", () => {
    const prog = compileParsedProgram(parse(progStr));
    let state = initializeVirtualMachine(2 ** 8);

    const log: string[] = [];
    state.jobState.print = (s) => log.push(s);

    const getSingleThreadStatus = () => state.jobState.getStatus();
    const getMemory = () => state.machineState.HEAP;
    const getThread = () => state.jobState;
    const getPC = () => state.jobState.getPC().addr;
    const _getRts = () =>
      getThread()
        .getRTS()
        .getScopeData()
        .map(({ env }) => env);

    const pcExecutionOrder: number[] = [];
    const maxInstrExecutions = 1000;

    while (getSingleThreadStatus() !== "DONE") {
      if (pcExecutionOrder.length > maxInstrExecutions)
        expect(pcExecutionOrder).toHaveLength(0);

      pcExecutionOrder.push(getPC());

      try {
        state = executeStep(state, prog.instructions);
      } catch (e) {
        const _lastHundredInstr = pcExecutionOrder
          .slice(-100)
          .map((i) => [i, prog.instructions[i].op]);
        throw e;
      }

      // const _memUsage = `${(getMemory().memory.alloc as any).FREE_PTR} / ${(getMemory().memory.alloc as any).memory.nodeCount}`;
      // const _memResidency = `${getMemResidency(getMemory())} / ${(getMemory().memory.alloc as any).memory.nodeCount}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

    expect(log).toEqual([
      "1",
      "3",
      "false",
      "'BAYBAYBAY'",
      "0x163",
      "false",
      "'BAYBAYBAY'",
      "0x115",
      "false",
      "'BAYBAYBAY'",
      "0xc7",
    ]);
  });
});
