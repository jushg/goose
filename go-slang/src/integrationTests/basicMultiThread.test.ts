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
    const osState: Record<string, string[]> = {};
    const printLast = (id: string, num: number, detailedNum: number = 10) => {
      let lastInstr: any[] = [];
      lastInstr = (pcExecutionOrder[id] ?? [])
        .slice(-num)
        .map((i, idx) => [
          i,
          prog.instructions[i].op,
          osState[id].slice(-num)[idx],
        ]);
      lastInstr = lastInstr.map(([i, op, os], idx) => {
        if (idx < lastInstr.length - detailedNum) return { i, op, os };
        return { i, ...prog.instructions[i], os };
      });
      return lastInstr;
    };
    const takeNoteOfLatestPC = () => {
      if (!pcExecutionOrder[getId()]) pcExecutionOrder[getId()] = [];
      pcExecutionOrder[getId()].push(getPC());
      if (!osState[getId()]) osState[getId()] = [];
      osState[getId()].push(state.jobState.getOS().toString());

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
