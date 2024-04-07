import { compileParsedProgram } from "../compiler";
import { parse } from "../parser";
import { executeStep, initializeVirtualMachine } from "../virtual_machine";

const progStr = `
var x int

func main() {
  getFn := func () func (x int, p *int) {
    return func (p *int) {
      print(x)
      print(&p)
    }
  }

  for i := 0; i < 100; i = i + 1 {
    go getFn()(&x)
  }
  go foo(1)
}

func foo(y int) {
  x = x + y
  if x < 100 {
    print(x)
    foo(y * 2)
  }
  print(x < x)
}
`;

describe.skip("basic multi threaded program", () => {
  it("should execute correctly", () => {
    const log: string[] = [];
    const prog = compileParsedProgram(parse(progStr));
    let state = initializeVirtualMachine(prog, (2 ** 8) ** 2, (s) =>
      log.push(s)
    );

    const getSingleThreadStatus = () => state.jobState.getStatus();
    const getId = () => state.jobState.getId();
    const getMemory = () => state.machineState.HEAP;
    const getThread = () => state.jobState;
    const getPC = () => state.jobState.getPC().addr;
    const _getRts = () =>
      getThread()
        .getRTS()
        .getScopeData()
        .map(({ env }) => env);

    const pcExecutionOrder: Record<string, number[]> = {};
    const maxInstrExecutions = 10000;

    while (getSingleThreadStatus() !== "DONE") {
      if (!pcExecutionOrder[getId()]) pcExecutionOrder[getId()] = [];
      pcExecutionOrder[getId()].push(getPC());

      if (pcExecutionOrder[getId()].length > maxInstrExecutions)
        expect(pcExecutionOrder[getId()]).toHaveLength(0);

      try {
        state = executeStep(state);
      } catch (e) {
        let _lastHundredInstr: any[] = pcExecutionOrder[getId()]
          .slice(-100)
          .map((i) => [i, prog.instructions[i].op]);
        _lastHundredInstr = _lastHundredInstr.map(([i, op], idx) => {
          if (idx < _lastHundredInstr.length - 10) return { i, op };
          return { i, ...prog.instructions[i] };
        });

        console.dir({ _lastHundredInstr });
        throw e;
      }

      const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

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
      expect.stringMatching(/0x[0-9a-f]+/),
    ]);
  });
});
