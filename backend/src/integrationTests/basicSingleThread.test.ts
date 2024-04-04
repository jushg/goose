import { compile } from "../compiler";
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
    innerFunc()
    foo(1)
    bar = "BAR2"
}

func foo(y int) {
    var baz string
    var bay string
    x = x + y
    if x < 16 {
        foo(y * 2)
    }
}
`;

describe("basic single threaded program", () => {
  it.skip("should execute correctly", () => {
    const prog = compile(parse(progStr));
    let state = initializeVirtualMachine();

    const getMemory = () => state.machineState.HEAP;
    const getThread = () => state.jobState;
    const getPC = () => state.jobState.getPC().addr;

    const pcExecutionOrder: number[] = [];
    const maxInstrExecutions = 100;

    console.dir(prog.instructions);

    while (getPC() !== prog.instructions.length) {
      if (pcExecutionOrder.length > maxInstrExecutions)
        expect(pcExecutionOrder).toHaveLength(0);

      pcExecutionOrder.push(getPC());
      state = executeStep(state, prog.instructions);
    }
  });
});
