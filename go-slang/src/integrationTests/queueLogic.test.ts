import { executeStep } from "../virtual_machine";
import { setUpTest } from "./utils";

describe("Test queue logic", () => {
  test.concurrent("test queue logic", async () => {
    const progStr = `
func main() {
  q := queueInit(4)
  print(queueSize(q))
  print(queueCapacity(q))
  pushBackQueue(q, 1)
  pushBackQueue(q, 2)
  pushBackQueue(q, 3)
  print(peekFrontQueue(q))
  pushBackQueue(q, 4)
  print(peekFrontQueue(q))
  print(queueSize(q))
  print(queueFull(q))
  print(popFrontQueue(q))
  print(popFrontQueue(q))
  print(popFrontQueue(q))
  print(popFrontQueue(q))
}
`;

    let { log, state, getId, prog, getPC } = setUpTest(progStr);
    let mainId = state.machineState.MAIN_ID;

    while (true) {
      try {
        const newState = executeStep(state);
        if (newState === null) break;
        state = newState;
      } catch (e) {
        throw e;
      }
    }
    if (log["GC"]) {
      delete log["GC"];
    }
    expect(log[mainId]).toEqual([
      "0",
      "4",
      "1",
      "1",
      "4",
      "true",
      "1",
      "2",
      "3",
      "4",
    ]);
  });
});
