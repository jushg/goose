import { AnyGoslingObject, assertGoslingType, Literal } from ".";
import { InstrAddr } from "../common/instructionObj";
import { createHeapManager, HeapAddr, HeapType } from "../memory";
import { GoslingMemoryManager } from "./memory";
import {
  createThreadControlObject,
  ThreadControlObject,
} from "./threadControl";

type Instr = (m: GoslingMemoryManager, t: ThreadControlObject) => void;

describe("Test memory manager and thread control object", () => {
  it("Single threaded execution", () => {
    let memory: GoslingMemoryManager;

    const progStr =
      `
  var int x                             0
                                        -
  func main() {                         1
                                        2
    var bar string                      -
    var baz int                         -
                                        -
    innerFn := func () {                3
                                        4
      baz = 1                           5
    }                                   6
                                        -
    bar = "BAR1"                        7
    innerFunc()                         8
    foo(1)                              9
    bar = "BAR2"                        10
  }                                     11
                                        -
  func foo(int y) {                     12
                                        13
    var baz string                      -
    var bay string                      -
    x = x + y                           14
                                        -
    if x < 16 {                         15
      foo(y * 2)                        16
    }                                   17
  }                                     18
  ` +
      /* added by compiler */ `
  // implied: main();                 19
  // implied: DONE                    20
  `;

    let isDone = false;
    const prog: Record<number, Instr> = {
      // Declarations
      0: (m, t) => {
        const staticDeclarations = {
          x: { type: HeapType.Int, data: 0 },
          main: {
            type: HeapType.BinaryPtr,
            child1: HeapAddr.getNull(),
            child2: HeapAddr.getNull(),
          },
          foo: {
            type: HeapType.BinaryPtr,
            child1: HeapAddr.getNull(),
            child2: HeapAddr.getNull(),
          },
        } satisfies Record<string, Literal<AnyGoslingObject>>;
        t.addFrame(staticDeclarations);
        t.incrPC();
      },

      1: (m, t) => {
        const staticFrame = t.getRTS();
        const mainLambda = m.allocLambda(
          staticFrame.getTopScopeAddr(), // main's enclosing rts
          InstrAddr.fromNum(2) // main pc
        );
        staticFrame.assign("main", m.get(mainLambda)!);
        t.setPC(InstrAddr.fromNum(12)); // Skip function execution
      },

      2: (m, t) => {
        const mainDeclarations: any = {
          bar: { type: HeapType.String, data: "" },
          baz: { type: HeapType.Int, data: 0 },
          innerFn: {
            type: HeapType.BinaryPtr,
            child1: HeapAddr.getNull(),
            child2: HeapAddr.getNull(),
          },
        } satisfies Record<string, Literal<AnyGoslingObject>>;
        t.addFrame(mainDeclarations);
        t.incrPC();
      },

      3: (m, t) => {
        const mainScope = t.getRTS();
        const innerFnLambda = m.allocLambda(
          mainScope.getTopScopeAddr(),
          InstrAddr.fromNum(4)
        );
        mainScope.assign("innerFn", m.get(innerFnLambda)!);

        t.setPC(InstrAddr.fromNum(7)); // Skip lambda steps using goto instr
      },

      4: (m, t) => {
        // inside braces of innerFn
        t.addFrame({});
        t.incrPC();
      },

      5: (m, t) => {
        const bazUpdated = { type: HeapType.Int, data: 1 } as const;
        t.getRTS().assign("baz", bazUpdated);

        t.incrPC();
      },

      6: (m, t) => {
        // End of the fn call.
        // Here this exits the scope of {'__callerPC', '__callerRTS'}
        t.exitSpecialFrame("CALL"); // Automatically sets PC, RTS to pre-call
        t.incrPC();
      },

      7: (m, t) => {
        t.getRTS().assign("bar", { type: HeapType.String, data: "BAR1" });
        t.incrPC();
      },

      8: (m, t) => {
        const scope = t.getRTS();
        const innerFnPtr = scope.lookup("innerFn")!;
        expect(innerFnPtr).not.toBeNull();
        assertGoslingType(HeapType.BinaryPtr, innerFnPtr);
        const innerFnLambda = m.getLambda(innerFnPtr);

        t.execFn(innerFnLambda); // Sets RTS and PC as necessary for call.
      },

      9: (m, t) => {
        const scope = t.getRTS();
        const fooPtr = scope.lookup("foo")!;
        expect(fooPtr).not.toBeNull();
        assertGoslingType(HeapType.BinaryPtr, fooPtr);
        const fooLambda = m.getLambda(fooPtr);

        t.getOS().push({ type: HeapType.Int, data: 10 }); // Add argument to OS
        t.execFn(fooLambda); // Sets RTS and PC as necessary for call.
      },

      10: (m, t) => {
        t.getRTS().assign("bar", { type: HeapType.String, data: "BAR2" });
        t.incrPC();
      },

      11: (m, t) => {
        t.exitSpecialFrame("CALL"); // Automatically sets PC, RTS to pre-call (exits main)
        t.incrPC();
      },

      12: (m, t) => {
        const staticFrame = t.getRTS();
        const fooLambda = m.allocLambda(
          staticFrame.getTopScopeAddr(),
          InstrAddr.fromNum(13)
        );
        staticFrame.assign("foo", m.get(fooLambda)!);
        t.setPC(InstrAddr.fromNum(19)); // Skip function execution
      },

      13: (m, t) => {
        const fooDeclarations = {
          baz: { type: HeapType.String, data: "" },
          bay: { type: HeapType.Int, data: 0 },
          y: { type: HeapType.Int, data: 0 }, // parameter of foo
        } satisfies Record<string, Literal<AnyGoslingObject>>;

        // inside braces of innerFn
        t.addFrame(fooDeclarations);
        t.getRTS().assign("y", t.getOS().pop()); // set fn call parameter.
        t.incrPC();
      },

      14: (m, t) => {
        const scope = t.getRTS();
        const x = scope.lookup("x")!;
        expect(x?.type).toBe(HeapType.Int);
        assertGoslingType(HeapType.Int, x);

        const y = scope.lookup("y")!;
        expect(y?.type).toBe(HeapType.Int);
        assertGoslingType(HeapType.Int, y);

        const updatedX = { ...x, data: x.data + y.data };
        scope.assign("x", updatedX);

        expect((scope.lookup("x") as any)?.data).toBe(updatedX.data);
        t.incrPC();
      },

      15: (m, t) => {
        const scope = t.getRTS();
        const x = scope.lookup("x")!;
        t.addFrame({}); // Add frame for if braces. Undone in 17

        expect(x?.type).toBe(HeapType.Int);
        assertGoslingType(HeapType.Int, x);
        t.setPC(InstrAddr.fromNum(x.data < 16 ? 16 : 17));
      },

      16: (m, t) => {
        const scope = t.getRTS();
        const fooPtr = scope.lookup("foo")!;
        expect(fooPtr).not.toBeNull();
        assertGoslingType(HeapType.BinaryPtr, fooPtr);
        const fooLambda = m.getLambda(fooPtr);

        // Add fn call argument to OS
        const y = scope.lookup("y")!;
        expect(y).not.toBeNull();
        assertGoslingType(HeapType.Int, y);
        t.getOS().push({ type: HeapType.Int, data: 2 * y.data });

        t.execFn(fooLambda); // Sets RTS and PC as necessary for call.
        // once returned, will have gone to 17.
      },

      17: (m, t) => {
        t.exitFrame();
        t.incrPC();
      },

      18: (m, t) => {
        t.exitSpecialFrame("CALL"); // Automatically sets PC, RTS to pre-call (exits foo)
        t.incrPC();
      },

      19: (m, t) => {
        const scope = t.getRTS();
        const mainPtr = scope.lookup("main")!;
        expect(mainPtr).not.toBeNull();
        assertGoslingType(HeapType.BinaryPtr, mainPtr);

        const mainLambda = m.getLambda(mainPtr);
        t.execFn(mainLambda); // Sets RTS and PC as necessary for call.
      },

      20: () => (isDone = true),
    };

    memory = new GoslingMemoryManager(createHeapManager(2 ** 10));
    let threadControlObj = createThreadControlObject(memory);

    while (!isDone) {
      /*
        `DOING instr: ${threadControlObj.getPC().addr}\n` +
        `RTS: ${threadControlObj.getRTS().toString()}`
      */
      prog[threadControlObj.getPC().addr](memory, threadControlObj);
    }
  });
});
