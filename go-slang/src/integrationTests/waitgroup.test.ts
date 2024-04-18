import { executeStep } from "../virtual_machine";
import { setUpTest as setUpMultiThreadedTest } from "./utils";

describe("Test waitgroup", () => {
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
});
