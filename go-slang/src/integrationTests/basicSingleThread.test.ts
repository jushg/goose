import { OpCode } from "../common/instructionObj";
import { compileParsedProgram } from "../compiler";
import { parse } from "../parser";
import { executeStep, initializeVirtualMachine } from "../virtual_machine";

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
    let state = initializeVirtualMachine();

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
      const _memUsage = `${(getMemory().memory.alloc as any).FREE_PTR} / ${(getMemory().memory.alloc as any).memory.nodeCount}`;
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
