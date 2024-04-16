import { executeStep } from "../virtual_machine";
import { setUpTest as setUpMultiThreadedTest } from "./utils";

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

  for i := 0; i < 120; i = i + 1 { yield() }
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

  test.concurrent("should execute correctly", async () => {
    let { log, state, getId, getPC, prog } = setUpMultiThreadedTest(progStr);
    const maxInstrExecutions = 2 * 10000;
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
  test.concurrent("test mutex", async () => {
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
    const maxInstrExecutions = 2 * 1000; // Reduced by 10x compared to other multi threaded test
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

  test.concurrent("test bounded sem block on wait", async () => {
    const progStr = `
var x int
var m *int

func main() {
  print("isMain")
  m = boundedSemInit(5, 0)

  bar := func () {
    print("isBar")
    boundedSemWait(m)
    x = x + 10
    boundedSemPost(m)
    print(x)
  }

  for i := 0; i < 5; i = i + 1 { go bar() }
  for i := 0; i < 10; i = i + 1 { yield() }

  for i := 0; i < 5; i = i + 1 {
    x = x + 1
    print(x)
  }
  boundedSemPost(m)
  for i := 0; i < 10; i = i + 1 { yield() }
  print(x)
}
    `;
    let { log, state, getId, prog, getPC } = setUpMultiThreadedTest(progStr);
    const maxInstrExecutions = 2 * 1200;
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
        // console.dir(printLast(getId(), 100, 20));
        throw e;
      }

      // const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      // const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

    const mainId = state.machineState.MAIN_ID;
    // console.dir(printLast(mainId, 100, 20));

    const barIds = Object.keys(log).filter((id) => id !== mainId);

    expect(Object.keys(log)).toContain(mainId);
    expect(log[mainId]).toHaveLength(7);
    expect(log[mainId]).toContain("'isMain'");
    expect(log[mainId].slice(1).map((i) => parseInt(i))).toEqual([
      1, 2, 3, 4, 5, 55,
    ]);
    for (const barId of barIds) {
      expect(log[barId]).toHaveLength(2);
      expect(log[barId]).toContain("'isBar'");
      expect(parseInt(log[barId][1])).toBeGreaterThan(5);
    }
    expect(barIds.map((i) => parseInt(log[i][1])).sort()).toEqual([
      15, 25, 35, 45, 55,
    ]);
  });

  test.concurrent("test bounded sem block on post", async () => {
    const progStr = `
var x int
var m *int

func main() {
  print("isMain")
  m = boundedSemInit(5, 5)

  bar := func () {
    print("isBar")
    boundedSemPost(m)
    x = x + 10
    boundedSemWait(m)
    print(x)
  }

  for i := 0; i < 5; i = i + 1 { go bar() }
  for i := 0; i < 10; i = i + 1 { yield() }

  for i := 0; i < 5; i = i + 1 {
    x = x + 1
    print(x)
  }
  boundedSemWait(m)
  for i := 0; i < 10; i = i + 1 { yield() }
  print(x)
}
    `;
    let { log, state, getId, prog, getPC } = setUpMultiThreadedTest(progStr);
    const maxInstrExecutions = 2 * 1200;
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
        // console.dir(printLast(getId(), 100, 20));
        throw e;
      }

      // const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      // const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }

    const mainId = state.machineState.MAIN_ID;
    // console.dir(printLast(mainId, 100, 20));

    const barIds = Object.keys(log).filter((id) => id !== mainId);

    expect(Object.keys(log)).toContain(mainId);
    expect(log[mainId]).toHaveLength(7);
    expect(log[mainId]).toContain("'isMain'");
    expect(log[mainId].slice(1).map((i) => parseInt(i))).toEqual([
      1, 2, 3, 4, 5, 55,
    ]);
    for (const barId of barIds) {
      expect(log[barId]).toHaveLength(2);
      expect(log[barId]).toContain("'isBar'");
      expect(parseInt(log[barId][1])).toBeGreaterThan(5);
    }
    expect(barIds.map((i) => parseInt(log[i][1])).sort()).toEqual([
      15, 25, 35, 45, 55,
    ]);
  });

  test.concurrent("test without waitgroup", async () => {
    const progStr = `
func main() {
  bar := func () {
    print("BAR")
    for i := 0; i < 10; i = i + 1 { yield() }
    print("not terminated!")
  }

  print("MAIN")
  
  for i := 0; i < 5; i++ {
    go bar()
  }

}
    `;
    let { log, state, getId, prog, getPC } = setUpMultiThreadedTest(progStr);
    const maxInstrExecutions = 2 * 1000; // Reduced by 10x compared to other multi threaded test
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

    expect(Object.keys(log)).toHaveLength(6);
    const mainId = state.machineState.MAIN_ID;
    // console.dir(printLast(mainId, 100, 20));

    const barIds = Object.keys(log).filter((id) => id !== mainId);

    expect(Object.keys(log)).toContain(mainId);
    expect(log[mainId]).toHaveLength(1);
    expect(log[mainId]).toContain("'MAIN'");

    for (const barId of barIds) {
      expect(log[barId]).toContainEqual(
        expect.stringMatching(/.*terminated by main thread\./)
      );
    }
  });

  test.concurrent("test with waitgroup", async () => {
    const progStr = `
func main() {
  wg := wgInit()
  bar := func () {
    print("BAR")
    for i := 0; i < 10; i = i + 1 { yield() }
    print("not terminated!")
    wgDone(wg)
  }

  print("MAIN")
  
  for i := 0; i < 5; i++ {
    wgAdd(wg)
    go bar()
  }

  wgWait(wg)
}
    `;
    let { log, state, getId, prog, getPC } = setUpMultiThreadedTest(progStr);
    const maxInstrExecutions = 2 * 1000; // Reduced by 10x compared to other multi threaded test
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

    expect(Object.keys(log)).toHaveLength(6);
    const mainId = state.machineState.MAIN_ID;
    // console.dir(printLast(mainId, 100, 20));

    const barIds = Object.keys(log).filter((id) => id !== mainId);

    expect(Object.keys(log)).toContain(mainId);
    expect(log[mainId]).toHaveLength(1);
    expect(log[mainId]).toContain("'MAIN'");

    for (const barId of barIds) {
      expect(log[barId]).toHaveLength(2);
      expect(log[barId]).toEqual(["'BAR'", "'not terminated!'"]);
    }
  });

  test.concurrent("test with unbuffered channel, full", async () => {
    const progStr = `
func main() {
  ch := make(chan int)
  bar := func () {
    print("BAR")
    for i := 0; i < 10; i = i + 1 { yield() }
    print("not terminated!")
    ch <- 1
  }

  print("MAIN")

  go bar()
  x := <-ch
  print("after receive")
  print(x)
}
    `;
    let { log, state, getId, prog, getPC } = setUpMultiThreadedTest(progStr);
    const maxInstrExecutions = 2 * 1000; // Reduced by 10x compared to other multi threaded test
    const pcExecutionOrder: Record<string, number[]> = {};
    while (true) {
      try {
        const newState = executeStep(state);
        if (newState === null) break;
        state = newState;
      } catch (e) {
        throw e;
      }

      // const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      // const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }
    expect(Object.keys(log)).toHaveLength(2);

    let barId = Object.keys(log).filter(
      (id) => id !== state.machineState.MAIN_ID
    )[0];
    expect(log[barId]).toEqual([
      "'BAR'",
      "'not terminated!'",
      expect.stringMatching(/.*terminated by main thread\./),
    ]);
    expect(log[state.machineState.MAIN_ID]).toEqual([
      "'MAIN'",
      "'after receive'",
      "1",
    ]);
  });

  test.concurrent("test with buffered channel, simple", async () => {
    const progStr = `
    func main() {
      ch := make(chan int, 2)
      ch <- 1
      ch <- 2
      print(<-ch)
      print(<-ch)
    }
    `;
    let { log, state, getId, prog, getPC } = setUpMultiThreadedTest(progStr);
    const maxInstrExecutions = 2 * 1000; // Reduced by 10x compared to other multi threaded test
    const pcExecutionOrder: Record<string, number[]> = {};
    while (true) {
      try {
        const newState = executeStep(state);
        if (newState === null) break;
        state = newState;
      } catch (e) {
        throw e;
      }

      // const _memUsage = `${getMemory().getMemoryUsed()} / ${getMemory().getMemorySize()}`;
      // const _memResidency = `${getMemory().getMemoryResidency()} / ${getMemory().getMemorySize()}`;
      // console.dir({ i: pcExecutionOrder.length, _memUsage, _memResidency });
    }
    expect(log[state.machineState.MAIN_ID]).toEqual(["1", "2"]);
  });
});
