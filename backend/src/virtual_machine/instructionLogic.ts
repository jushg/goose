import { AnyGoslingObject, Literal } from ".";
import {
  AnyInstructionObj,
  InstrAddr,
  OpCode,
  assertOpType,
} from "../common/instructionObj";
import { ExecutionState } from "../common/state";
import { HeapAddr, HeapType } from "../memory";
import { AnyLiteralObj, AnyTypeObj } from "../parser";
import { assertGoslingObject, isGoslingObject } from "./threadControl";

export function executeInstruction(
  ins: AnyInstructionObj,
  es: ExecutionState
): void {
  instructionFn[ins.op](ins, es);
}

const instructionFn: {
  [key in OpCode]: (ins: AnyInstructionObj, es: ExecutionState) => void;
} = {
  [OpCode.NOP]: (ins: AnyInstructionObj, es: ExecutionState) => {
    es.jobState.incrPC();
  },
  [OpCode.LDC]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    assertOpType(OpCode.LDC, ins);
    es.jobState.getOS().push(getHeapNodeFromLiteral(ins.val));
    es.jobState.incrPC();
  },
  [OpCode.DECL]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    assertOpType(OpCode.DECL, ins);
    es.jobState.getRTS().assign(ins.symbol, getDefaultTypeValue(ins.val));

    if (ins.val.type.base === "FUNC") {
      const funcLambdaAddr = es.machineState.HEAP.allocLambda(
        es.jobState.getRTS().getTopScopeAddr(), // main's enclosing rts
        InstrAddr.fromNum(es.jobState.getPC().addr + 2) // main pc
      );
      const funcLambda = es.machineState.HEAP.get(funcLambdaAddr);
      if (funcLambda === null) {
        throw new Error("Lambda not assigned properly in memory");
      }
      es.jobState.getRTS().assign(ins.symbol, funcLambda);
    }
    es.jobState.incrPC();
  },
  [OpCode.POP]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    es.jobState.getOS().pop();
    es.jobState.incrPC();
  },
  [OpCode.JOF]: function (ins: AnyInstructionObj, es: ExecutionState): void {
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
  },
  [OpCode.GOTO]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    assertOpType(OpCode.GOTO, ins);
    es.jobState.setPC(ins.addr);
  },
  [OpCode.ENTER_SCOPE]: function (
    ins: AnyInstructionObj,
    es: ExecutionState
  ): void {
    assertOpType(OpCode.ENTER_SCOPE, ins);
    let decls: Record<string, Literal<AnyGoslingObject>> = {};
    ins.scopeDecls.forEach(([symbol, val]) => {
      decls[symbol] = getDefaultTypeValue(val);
    });
    es.jobState.addFrame(decls);
    es.jobState.incrPC();
  },
  [OpCode.EXIT_SCOPE]: function (
    ins: AnyInstructionObj,
    es: ExecutionState
  ): void {
    es.jobState.exitFrame();
    es.jobState.incrPC();
  },
  [OpCode.LD]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    assertOpType(OpCode.LD, ins);
    let val = es.jobState.getRTS().lookup(ins.symbol);
    if (val === null) {
      throw new Error(`Symbol ${ins.symbol} not found in envs`);
    }
    es.jobState.getOS().push(val);
    es.jobState.incrPC();
  },
  [OpCode.ASSIGN]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    let lhs = es.jobState.getOS().pop();
    let rhs = es.jobState.getOS().pop();

    // Assign with value and address
    assertGoslingObject(lhs);
    es.machineState.HEAP.set(lhs.addr, rhs);
    es.jobState.incrPC();
  },
  [OpCode.CALL]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    let fn = es.jobState.getOS().pop();

    if (fn.type !== HeapType.BinaryPtr || !isGoslingObject(fn)) {
      throw new Error("Expected function pointer on top of stack");
    }
    const innerFnLambda = es.machineState.HEAP.getLambda(fn);
    es.jobState.execFn(innerFnLambda);
  },
  [OpCode.RESET]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.DONE]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    es.machineState.IS_RUNNING = false;
  },
  [OpCode.TEST_AND_SET]: function (
    ins: AnyInstructionObj,
    es: ExecutionState
  ): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.CLEAR]: function (ins: AnyInstructionObj, es: ExecutionState): void {
    throw new Error("Function not implemented.");
  },
  [OpCode.GOROUTINE]: function (
    ins: AnyInstructionObj,
    es: ExecutionState
  ): void {
    throw new Error("Function not implemented.");
  },
};

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

function getHeapNodeFromLiteral(x: AnyLiteralObj): Literal<AnyGoslingObject> {
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
    case "FUNC":
      assertLiteral("FUNC", x);
      return {
        type: HeapType.BinaryPtr,
        child1: HeapAddr.getNull(),
        child2: HeapAddr.getNull(),
      };
  }
}
