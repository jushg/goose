import { compileParsedProgram } from "../compiler";
import { parse } from "../parser";
import { executeStep, initializeVirtualMachine } from "../virtual_machine";

const progStr = `
var x int

func main() {
  getFn := func () func (int, *int) {
    return func (y int, p *int) {
      print(y)
      print(*p)
    }
  }

  for i := 0; i < 50; i = i + 1 {
    go getFn()(x, &x)
  }

  go foo(1)

  for i := 0; i < 50; i = i + 1 {
    go getFn()(x, &x)
  }
  print("This is main.")
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

describe("basic multi threaded program", () => {
  it("should execute correctly", () => {
    const log: Record<string, string[]> = {};
    const prog = compileParsedProgram(parse(progStr));
    let state = initializeVirtualMachine(prog, (2 ** 8) ** 2, (ctx, s) => {
      const pushLog = (id: string, s: string) => {
        if (!log[id]) log[id] = [];
        log[id].push(s);
      };
      "threadId" in ctx ? pushLog(ctx.threadId, s) : pushLog(ctx.component, s);
    });

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
    let lastHundredInstr: any[] = [];
    const updateLastHundredInstr = () => {
      lastHundredInstr = pcExecutionOrder[getId()]
        .slice(-100)
        .map((i) => [i, prog.instructions[i].op]);
      lastHundredInstr = lastHundredInstr.map(([i, op], idx) => {
        if (idx < lastHundredInstr.length - 10) return { i, op };
        return { i, ...prog.instructions[i] };
      });
    };

    while (true) {
      if (!pcExecutionOrder[getId()]) pcExecutionOrder[getId()] = [];
      pcExecutionOrder[getId()].push(getPC());
      updateLastHundredInstr();

      if (pcExecutionOrder[getId()].length > maxInstrExecutions)
        expect(pcExecutionOrder[getId()]).toHaveLength(0);

      try {
        const newState = executeStep(state);
        if (newState === null) break;
        state = newState;
      } catch (e) {
        console.dir(lastHundredInstr);
        throw e;
      }

      // const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      // const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

    // console.dir(lastHundredInstr);
    expect(Object.keys(log)).toHaveLength(1 + /* getFn */ 100 + /* foo */ 1);

    const mainId = "t_00001__from_____0";
    const otherIdsAndPc = Object.keys(log)
      .filter((id) => id !== mainId)
      .map((id) => {
        const idSplit = id.split("_");
        return [parseInt(idSplit.at(-1)!, 16), id] as const;
      })
      .reduce((acc: Record<number, string[]>, [pc, id]) => {
        if (acc[pc] === undefined) acc[pc] = [];
        acc[pc].push(id);
        return acc;
      }, {});
    const fooId = Object.entries(otherIdsAndPc)
      .filter(([_, ids]) => ids.length === 1)
      ?.at(0)
      ?.at(1)
      ?.at(0)!;
    const getFnIds: string[] = Object.entries(otherIdsAndPc)
      .filter(([_, ids]) => ids.length === 50)
      .flatMap(([_, ids]) => ids);

    expect(fooId).toBeDefined();
    expect(getFnIds).toBeDefined();

    expect(log[mainId]).toEqual(["'This is main.'"]);
    expect(log[fooId]).not.toContain("'This is main.'");

    let fnCountAfterFooExecution = 0;
    for (const getFnId of getFnIds) {
      expect(log[getFnId]).not.toContain("'This is main.'");
      expect(log[getFnId]).toHaveLength(2);
      const [y, p] = log[getFnId];
      expect(parseInt(y)).not.toBeGreaterThan(parseInt(p));
      if (p !== "0") fnCountAfterFooExecution++;
    }
    expect(fnCountAfterFooExecution).toBeGreaterThan(0);
    expect(fnCountAfterFooExecution).toBeLessThan(100);

    expect(log[fooId]).toEqual([
      "1",
      "3",
      "7",
      "15",
      "31",
      "63",
      "false",
      "false",
      "false",
      "false",
      "false",
      "false",
      "false",
    ]);
  });
});

describe("Test concurrency primitives", () => {
  it.todo("test_and_set instructions");
});
