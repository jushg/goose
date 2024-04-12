import { AnyGoslingObject, Literal, assertGoslingType } from ".";
import {
  AnyInstructionObj,
  InstrAddr,
  OpCode,
  assertOpType,
} from "../common/instructionObj";
import { ExecutionState } from "../common/state";
import { HeapAddr, HeapType } from "../memory";
import { AnyLiteralObj, AnyTypeObj, FuncLiteralObj } from "../parser";
import { getBinaryOpLogic, getUnaryOpLogic } from "./alu";
import { sysCallLogic } from "./sysCalls";
import {
  assertGoslingObject,
  createThreadControlObject,
  equalsAsGoslingLiterals,
  isGoslingObject,
} from "./threadControl";

export function executeInstruction(
  ins: AnyInstructionObj,
  es: ExecutionState
): void {
  getInstructionLogic(ins.op)(ins, es);
}

function getInstructionLogic(
  key: OpCode
): (ins: AnyInstructionObj, es: ExecutionState) => void {
  switch (key) {
    case OpCode.NOP:
      return (ins, es) => {
        es.jobState.incrPC();
      };

    case OpCode.LDC:
      return (ins, es) => {
        assertOpType(OpCode.LDC, ins);
        es.jobState.getOS().push(getHeapNodeFromLiteral(ins.val));
        es.jobState.incrPC();
      };

    case OpCode.DECL:
      return (ins, es) => {
        assertOpType(OpCode.DECL, ins);
        es.jobState.getRTS().assign(ins.symbol, getDefaultTypeValue(ins.val));
        es.jobState.incrPC();
      };

    case OpCode.POP:
      return (ins, es) => {
        es.jobState.getOS().pop();
        es.jobState.incrPC();
      };

    case OpCode.JOF:
      return (ins, es) => {
        assertOpType(OpCode.JOF, ins);
        let topOp = es.jobState.getOS().pop();
        if (topOp.type !== HeapType.Bool) {
          throw new Error("Expected boolean value on top of stack");
        }
        if (!topOp.data) {
          es.jobState.setPC(ins.addr);
        } else {
          es.jobState.incrPC();
        }
      };

    case OpCode.GOTO:
      return (ins, es) => {
        assertOpType(OpCode.GOTO, ins);
        es.jobState.setPC(ins.addr);
      };

    case OpCode.ENTER_SCOPE:
      return (ins, es) => {
        assertOpType(OpCode.ENTER_SCOPE, ins);
        if (ins.label === "FOR") es.jobState.execFor();
        es.jobState.addFrame(ins.scopeDecls.map(([sym, _type]) => sym));
        es.jobState.incrPC();
      };

    case OpCode.EXIT_SCOPE:
      return (ins, es) => {
        assertOpType(OpCode.EXIT_SCOPE, ins);
        ins.label
          ? es.jobState.exitSpecialFrame(ins.label)
          : es.jobState.exitFrame();
        es.jobState.incrPC();
      };

    case OpCode.LD:
      return (ins, es) => {
        assertOpType(OpCode.LD, ins);
        let val = es.jobState.getRTS().lookup(ins.symbol);
        if (val === null) {
          throw new Error(`Symbol ${ins.symbol} not found in envs`);
        }
        es.jobState.getOS().push(val.addr);
        es.jobState.incrPC();
      };

    case OpCode.ASSIGN:
      return (ins, es) => {
        let lhs = es.jobState.getOS().pop();
        let rhs = es.jobState.getOS().pop();

        // Assign with value and address
        assertGoslingObject(lhs);
        es.machineState.HEAP.set(lhs.addr, rhs);
        es.jobState.incrPC();
      };

    case OpCode.CALL:
      return (ins, es) => {
        let fn = es.jobState.getOS().pop();

        if (fn.type !== HeapType.BinaryPtr || !isGoslingObject(fn)) {
          throw new Error("Expected function pointer on top of stack");
        }
        const innerFnLambda = es.machineState.HEAP.getLambda(fn);
        es.jobState.execFn(innerFnLambda);
      };

    case OpCode.TEST_AND_SET:
      return (ins, es) => {
        /* 
          The form of TEST_AND_SET is as such:

          - LD Desired  (or sequence of operations that result in OS.push arg Desired)
          - LD Expected  (or sequence of operations that result in OS.push arg Expected)
          - LD Ptr  (or sequence of operations that result in OS.push arg Ptr)
          - TEST_AND_SET (OS.push true or false based on success of operation)

          - rest of program
         */
        const ptr = es.jobState.getOS().pop();
        assertGoslingType(HeapType.BinaryPtr, ptr);
        const expected = es.jobState.getOS().pop();
        const desired = es.jobState.getOS().pop();

        const obj = es.machineState.HEAP.get(ptr.child1);
        if (obj === null)
          throw new Error("Expected a valid object at the address");
        const success = equalsAsGoslingLiterals(obj, expected);
        if (success) es.machineState.HEAP.set(ptr.child1, desired);
        es.jobState.getOS().push({
          type: HeapType.Bool,
          data: success,
        });
        es.jobState.incrPC();
      };

    case OpCode.GOROUTINE:
      return (ins, es) => {
        /* 
          The form of GOROUTINE is as such:

          - LD A  (or sequence of operations that result in OS.push arg A)
          - LD B  (or sequence of operations that result in OS.push arg B)
          ...
          - LD N  (or sequence of operations that result in OS.push arg N)
          - LD f  (or sequence of operations that result in OS.push arg f)
          - GOROUTINE N
          - CALL N
          - SYSCALL 'DONE'
          - rest of program

          By using the OS, we can use function literals or fn arguments that are expressions
          E.g.:
          go (getFunction(foo, bar, baz))(getSomeIntParam(), &someGlobalVar)
          
          the CALL N and SYSCALL 'DONE' are the next two instructions for the goroutine
          the rest of the program is the continuation of the main thread (rmbr to remove call args)
         */
        assertOpType(OpCode.GOROUTINE, ins);

        // Duplicate the relevant OS items [lambdaPtr, arg1, arg2, ... argN] to protect from OS .pop / .push.
        const args: AnyGoslingObject[] = [];
        for (let argIdx = 0; argIdx < ins.args + 1; argIdx++) {
          const arg = es.jobState.getOS().pop();
          args.push(es.machineState.HEAP.alloc(arg));
        }

        const duplicatedOS =
          es.machineState.HEAP.allocList(args.map((arg) => arg.addr)).at(0)
            ?.nodeAddr || HeapAddr.getNull();

        const callPC = InstrAddr.fromNum(es.jobState.getPC().addr + 1);
        const restOfProgramPc = InstrAddr.fromNum(es.jobState.getPC().addr + 3);

        const goroutine = createThreadControlObject(
          es.machineState.HEAP,
          es.vmPrinter,
          {
            pc: callPC,
            os: duplicatedOS,
            status: "RUNNABLE",
            rts: es.jobState.getRTS().getTopScopeAddr(),
          }
        );
        es.machineState.JOB_QUEUE.enqueue(goroutine);
        es.jobState.setPC(restOfProgramPc);
      };

    case OpCode.SYS_CALL:
      return (ins, es) => {
        assertOpType(OpCode.SYS_CALL, ins);
        if (!(ins.sym in sysCallLogic)) {
          throw new Error(`Unsupported sysCall: ${ins.sym}`);
        }
        const sysCall = sysCallLogic[ins.sym as keyof typeof sysCallLogic];
        sysCall({ es, ins, memory: es.machineState.HEAP, thread: es.jobState });
        es.jobState.incrPC();
      };

    case OpCode.ALU:
      return (ins, es) => {
        assertOpType(OpCode.ALU, ins);
        if ("binary" in ins) {
          const binaryOpLogic = getBinaryOpLogic(ins.binary);
          binaryOpLogic(ins, es);
        } else {
          const unaryOpLogic = getUnaryOpLogic(ins.unary);
          unaryOpLogic(ins, es);
        }
        es.jobState.incrPC();
      };

    default: {
      const _: never = key;
      throw new Error(`Unhandled OpCode: ${key}`);
    }
  }
}

function isLiteral<T extends AnyLiteralObj["type"]["type"]["base"]>(
  expectedType: T,
  x: AnyLiteralObj
): x is Extract<AnyLiteralObj, { type: { type: { base: T } } }> {
  return expectedType === x["type"]["type"]["base"];
}

function assertLiteral<T extends AnyLiteralObj["type"]["type"]["base"]>(
  expectedType: T,
  x: AnyLiteralObj
): asserts x is Extract<AnyLiteralObj, { type: { type: { base: T } } }> {
  if (!isLiteral(expectedType, x)) {
    throw new Error(`Expected literal type ${expectedType} on ${x}`);
  }
}

function getDefaultTypeValue(x: AnyTypeObj): Literal<AnyGoslingObject> {
  switch (x.type.base) {
    case "BOOL":
      return {
        type: HeapType.Bool,
        data: false,
      };
    case "INT":
      return {
        type: HeapType.Int,
        data: 0,
      };
    case "STR":
      return {
        type: HeapType.String,
        data: "",
      };
    default:
      return {
        type: HeapType.BinaryPtr,
        child1: HeapAddr.getNull(),
        child2: HeapAddr.getNull(),
      };
  }
}

function getHeapNodeFromLiteral(
  x: Exclude<AnyLiteralObj, FuncLiteralObj>
): Literal<AnyGoslingObject> {
  switch (x.type.type.base) {
    case "BOOL":
      assertLiteral("BOOL", x);
      return {
        type: HeapType.Bool,
        data: x.val,
      };
    case "INT":
      assertLiteral("INT", x);
      return {
        type: HeapType.Int,
        data: x.val,
      };
    case "STR":
      assertLiteral("STR", x);
      return {
        type: HeapType.String,
        data: x.val,
      };
    case "NIL":
      assertLiteral("NIL", x);
      return {
        type: HeapType.BinaryPtr,
        child1: HeapAddr.getNull(),
        child2: HeapAddr.getNull(),
      };
  }
}
