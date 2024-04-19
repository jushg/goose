import { executeStep } from "../virtual_machine";
import { setUpTest as setUpMultiThreadedTest } from "./utils";

describe("Test mutex", () => {
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

    if (log["GC"]) {
      delete log["GC"];
    }
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
