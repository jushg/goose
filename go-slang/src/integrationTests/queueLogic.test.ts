import { executeStep } from "../virtual_machine";
import { setUpTest } from "./utils";

describe("Test queue logic", () => {
  test.concurrent("test queue logic", async () => {
    const progStr = `
func main() {
  q := queueInit(4)
  print(queueCapacity(q))
  print(queueSize(q))
  print(queueEmpty(q))
  print(queueFull(q))
  pushBackQueue(q, 1)

}
`;

    // pushBackQueue(q, 2)
    // pushBackQueue(q, 3)
    // pushBackQueue(q, 4)
    // print(queueFull(q))
    // print(popFrontQueue(q))
    // print(popFrontQueue(q))
    // print(popFrontQueue(q))
    // pushBackQueue(q, 5)
    // pushBackQueue(q, 6)
    // pushBackQueue(q, 7)
    // print(queueSize(q))
    // print(queueEmpty(q))
    // print(popFrontQueue(q))
    // print(popFrontQueue(q))
    // print(popFrontQueue(q))

    let { log, state, getId, prog, getPC } = setUpTest(progStr);
    const maxInstrExecutions = 1000; // Reduced by 10x compared to other multi threaded test
    const pcExecutionOrder: Record<string, number[]> = {};

    while (true) {
      try {
        const newState = executeStep(state);
        if (newState === null) break;
        state = newState;
      } catch (e) {
        throw e;
      }
    }
    console.dir(log);
  });
});
