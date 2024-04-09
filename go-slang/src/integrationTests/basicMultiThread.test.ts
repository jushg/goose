import { compileParsedProgram } from "../compiler";
import { parse } from "../parser";
import { executeStep, initializeVirtualMachine } from "../virtual_machine";

const setUpMultiThreadedTest = (progStr: string) => {
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

  return {
    log,
    prog,
    state,
    getId,
    getMemory,
    getThread,
    getPC,
    _getRts,
  };
};

describe("basic multi threaded program", () => {
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

  it("should execute correctly", () => {
    let { log, state, getId, getPC, prog } = setUpMultiThreadedTest(progStr);
    const maxInstrExecutions = 10000;
    const pcExecutionOrder: Record<string, number[]> = {};
    const printLast = (id: string, num: number, detailedNum: number = 10) => {
      let lastInstr: any[] = [];
      lastInstr = (pcExecutionOrder[id] ?? [])
        .slice(-num)
        .map((i) => [i, prog.instructions[i].op]);
      lastInstr = lastInstr.map(([i, op], idx) => {
        if (idx < lastInstr.length - detailedNum) return { i, op };
        return { i, ...prog.instructions[i] };
      });
      return lastInstr;
    };
    const takeNoteOfLatestPC = () => {
      if (!pcExecutionOrder[getId()]) pcExecutionOrder[getId()] = [];
      pcExecutionOrder[getId()].push(getPC());

      if (pcExecutionOrder[getId()].length > maxInstrExecutions)
        expect(pcExecutionOrder[getId()]).toHaveLength(0);
    };

    while (true) {
      takeNoteOfLatestPC();

      try {
        const newState = executeStep(state);
        if (newState === null) break;
        state = newState;
      } catch (e) {
        console.dir(printLast(getId(), 100, 20));
        throw e;
      }

      // const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      // const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

    // console.dir(lastHundredInstr);
    expect(Object.keys(log)).toHaveLength(1 + /* getFn */ 100 + /* foo */ 1);

    const mainId = state.machineState.MAIN_ID;
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
  it("test mutex", () => {
    const progStr = `
var x int
var m *int

func main() {
  m = mutexInit()
  bar := func () {
    mutexLock(m)
    print(x)
    mutexUnlock(m)
  }


  mutexLock(m)

  for i := 0; i < 5; i = i + 1 { go bar() }

  print(x)
  go foo(1)

  for i := 0; i < 5; i = i + 1 { go bar() }

  mutexUnlock(m)
}

func foo(y int) {
  x = 100
  print(x)
}
    `;
    let { log, state, getId, prog, getPC } = setUpMultiThreadedTest(progStr);
    const maxInstrExecutions = 10000;
    const pcExecutionOrder: Record<string, number[]> = {};
    const printLast = (id: string, num: number, detailedNum: number = 10) => {
      let lastInstr: any[] = [];
      lastInstr = (pcExecutionOrder[id] ?? [])
        .slice(-num)
        .map((i) => [i, prog.instructions[i].op]);
      lastInstr = lastInstr.map(([i, op], idx) => {
        if (idx < lastInstr.length - detailedNum) return { i, op };
        return { i, ...prog.instructions[i] };
      });
      return lastInstr;
    };
    const takeNoteOfLatestPC = () => {
      if (!pcExecutionOrder[getId()]) pcExecutionOrder[getId()] = [];
      pcExecutionOrder[getId()].push(getPC());

      if (pcExecutionOrder[getId()].length > maxInstrExecutions)
        expect(pcExecutionOrder[getId()]).toHaveLength(0);
    };

    const ls: string[] = [];

    while (true) {
      ls.push(getId());
      takeNoteOfLatestPC();

      try {
        const newState = executeStep(state);
        if (newState === null) break;
        state = newState;
      } catch (e) {
        // console.dir(printLast(getId(), 100, 20));
        throw e;
      }

      // const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      // const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

    const mainId = state.machineState.MAIN_ID;
    // console.dir(printLast(mainId, 100, 20));

    expect(Object.keys(log)).toHaveLength(1 + /* getFn */ 10 + /* foo */ 1);

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
    const printXIds: string[] = Object.entries(otherIdsAndPc)
      .filter(([_, ids]) => ids.length === 10)
      .flatMap(([_, ids]) => ids);
    const fooId = Object.entries(otherIdsAndPc).filter(
      ([_, ids]) => ids.length === 1
    )![0][1][0];

    expect(Object.keys(log)).toContain(mainId);
    expect(log[mainId]).toHaveLength(1);
    expect(log[mainId]).toContain("0");

    expect(log[fooId]).toHaveLength(1);
    expect(log[fooId]).toContain("100");

    expect(printXIds).toBeDefined();
    for (const printXId of printXIds) {
      expect(log[printXId]).not.toContain("'This is main.'");
      expect(log[printXId]).toHaveLength(1);
      const [x] = log[printXId];
      expect(parseInt(x)).toEqual(100);
    }
  });
});
