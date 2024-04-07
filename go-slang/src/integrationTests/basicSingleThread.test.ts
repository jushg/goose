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
    let state = initializeVirtualMachine(2 ** 8);

    const log: string[] = [];
    state.jobState.print = (s) => log.push(s);

    const getSingleThreadStatus = () => state.jobState.getStatus();
    const getMemory = () => state.machineState.HEAP;
    const getThread = () => state.jobState;
    const getPC = () => state.jobState.getPC().addr;
    const getRts = () =>
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

        console.dir(getRts());
        throw e;
      }

      // const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      // const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

    expect(log).toEqual([
      "1",
      "3",
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
    ]);
  });
});
