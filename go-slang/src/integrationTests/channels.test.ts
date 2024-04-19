import { executeStep } from "../virtual_machine";
import { setUpTest as setUpMultiThreadedTest } from "./utils";

describe("Test channels", () => {
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
    if (log["GC"]) {
      delete log["GC"];
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
    const maxInstrExecutions = 2 * 4000; // Reduced by 10x compared to other multi threaded test
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
    if (log["GC"]) {
      delete log["GC"];
    }
    expect(log[state.machineState.MAIN_ID]).toEqual(["1", "2"]);
  });
});
