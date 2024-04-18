import { executeStep } from "../virtual_machine";
import { setUpTest as setUpMultiThreadedTest } from "./utils";

describe("Test semaphores", () => {
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
});
