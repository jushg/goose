import { OpCode } from "../common/instructionObj";
import { compileParsedProgram } from "../compiler";
import { parse } from "../parser";
import { executeStep, initializeVirtualMachine } from "../virtual_machine";

const progStr = `
var x int

func main() {
    var bar string
    var baz int
    innerFn := func () {
        baz = 1
    }
    bar = "BAR1"
    innerFn()
    foo(1)
    bar = "BAR2"
}

func foo(y int) {
    var baz string
    var bay string
    x = x + y
    if x < 4 {
        foo(y * 2)
    }

    for i := 0; i < 3; i = i + 1 {
      baz = "BAZ"
      bay = "BAY"
    }
}
`;

describe("basic single threaded program", () => {
  it("should execute correctly", () => {
    const prog = compileParsedProgram(parse(progStr));
    let state = initializeVirtualMachine();
    const getSingleThreadStatus = () => state.jobState.getStatus();
    const getMemory = () => state.machineState.HEAP;
    const getThread = () => state.jobState;
    const getPC = () => state.jobState.getPC().addr;
    const printRts = () =>
      console.dir(
        getThread()
          .getRTS()
          .getScopeData()
          .map(({ env }) => env),
        { depth: null }
      );

    const pcExecutionOrder: number[] = [];
    const maxInstrExecutions = 400;

    while (getSingleThreadStatus() !== "DONE") {
      if (pcExecutionOrder.length > maxInstrExecutions)
        expect(pcExecutionOrder).toHaveLength(0);

      pcExecutionOrder.push(getPC());

      try {
        state = executeStep(state, prog.instructions);
      } catch (e) {
        throw e;
      }
    }
  });
});
