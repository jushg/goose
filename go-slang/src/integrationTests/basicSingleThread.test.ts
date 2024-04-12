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
  print(bar)
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
  return
}
`;

describe("basic single threaded program", () => {
  it("should execute correctly", () => {
    const log: string[] = [];
    const prog = compileParsedProgram(parse(progStr));
    let state = initializeVirtualMachine(prog, (2 ** 8) ** 2, (ctx, s) =>
      "threadId" in ctx ? log.push(s) : null
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

    let lastHundredInstr: any[] = [];
    const updateLastHundredInstr = () => {
      lastHundredInstr = pcExecutionOrder
        .slice(-100)
        .map((i) => [i, prog.instructions[i].op]);
      lastHundredInstr = lastHundredInstr.map(([i, op], idx) => {
        if (idx < lastHundredInstr.length - 10) return { i, op };
        return { i, ...prog.instructions[i] };
      });
    };

    while (true) {
      if (pcExecutionOrder.length > maxInstrExecutions)
        expect(pcExecutionOrder).toHaveLength(0);

      pcExecutionOrder.push(getPC());
      updateLastHundredInstr();

      try {
        const newState = executeStep(state);
        if (newState === null) break;
        state = newState;
      } catch (e) {
        // console.dir(lastHundredInstr);
        throw e;
      }

      // const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      // const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

    // console.dir(lastHundredInstr);
    expect(log).toEqual([
      "1",
      "3",
      "7",
      "15",
      "31",
      "63",
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
      "false",
      "'BAYBAYBAY'",
      expect.stringMatching(/0x[0-9a-f]+/),
      expect.stringMatching(/0x[0-9a-f]+/),
      "'BAR2'",
    ]);
  });
});
