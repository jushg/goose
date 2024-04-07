import { compileParsedProgram } from "../compiler";
import { parse } from "../parser";
import { executeStep, initializeVirtualMachine } from "../virtual_machine";

const progStr = `
var x int

func main() {
  var bar string
  var baz int
  innerFn := func () {
    baz = 9000
  }
  printIntPtr := func (p *int) {
    print(*p)
  }
  bar = "BAR1"
  innerFn()
  foo(1)
  bar = "BAR2"
  print(&x)
  print(&baz)
}

func foo(y int) {
  var baz string
  var bay string
  x = x + y
  if x < 100 {
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
    const log: string[] = [];
    const prog = compileParsedProgram(parse(progStr));
    let state = initializeVirtualMachine(prog, (2 ** 8) ** 2, (s) =>
      log.push(s)
    );

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
        state = executeStep(state);
      } catch (e) {
        const _lastHundredInstr = pcExecutionOrder
          .slice(-100)
          .map((i) => [i, prog.instructions[i].op]);
        throw e;
      }

      const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

    expect(log).toEqual([
      "Thread t_00001__from_____0: 1",
      "Thread t_00001__from_____0: 3",
      "Thread t_00001__from_____0: 7",
      "Thread t_00001__from_____0: 15",
      "Thread t_00001__from_____0: 31",
      "Thread t_00001__from_____0: 63",
      "Thread t_00001__from_____0: false",
      "Thread t_00001__from_____0: 'BAYBAYBAY'",
      expect.stringMatching(/Thread t_00001__from_____0: 0x[0-9a-f]+/),
      "Thread t_00001__from_____0: false",
      "Thread t_00001__from_____0: 'BAYBAYBAY'",
      expect.stringMatching(/Thread t_00001__from_____0: 0x[0-9a-f]+/),
      "Thread t_00001__from_____0: false",
      "Thread t_00001__from_____0: 'BAYBAYBAY'",
      expect.stringMatching(/Thread t_00001__from_____0: 0x[0-9a-f]+/),
      "Thread t_00001__from_____0: false",
      "Thread t_00001__from_____0: 'BAYBAYBAY'",
      expect.stringMatching(/Thread t_00001__from_____0: 0x[0-9a-f]+/),
      "Thread t_00001__from_____0: false",
      "Thread t_00001__from_____0: 'BAYBAYBAY'",
      expect.stringMatching(/Thread t_00001__from_____0: 0x[0-9a-f]+/),
      "Thread t_00001__from_____0: false",
      "Thread t_00001__from_____0: 'BAYBAYBAY'",
      expect.stringMatching(/Thread t_00001__from_____0: 0x[0-9a-f]+/),
      "Thread t_00001__from_____0: false",
      "Thread t_00001__from_____0: 'BAYBAYBAY'",
      expect.stringMatching(/Thread t_00001__from_____0: 0x[0-9a-f]+/),
      expect.stringMatching(/Thread t_00001__from_____0: 0x[0-9a-f]+/),
      expect.stringMatching(/Thread t_00001__from_____0: 0x[0-9a-f]+/),
    ]);
  });
});
