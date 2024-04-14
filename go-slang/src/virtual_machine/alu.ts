import { GoslingIntObj, Literal, assertGoslingType } from ".";
import { AnyInstructionObj } from "../common/instructionObj";
import { ExecutionState } from "../common/state";
import { HeapAddr, HeapType } from "../memory";
import { BinaryOpSymbol, UnaryOpSymbol } from "../parser";

export function getUnaryOpLogic(
  key: UnaryOpSymbol
): (ins: AnyInstructionObj, es: ExecutionState) => void {
  switch (key) {
    case "+":
      return (_, es) => {
        const val = es.jobState.getOS().pop();
        assertGoslingType(HeapType.Int, val);
        es.jobState.getOS().push(val);
      };

    case "-":
      return (_, es) => {
        const val = es.jobState.getOS().pop();
        assertGoslingType(HeapType.Int, val);
        const newVal = { type: HeapType.Int, data: -val.data } as const;
        es.jobState.getOS().push(newVal);
      };

    case "!":
      return (_, es) => {
        const val = es.jobState.getOS().pop();
        assertGoslingType(HeapType.Bool, val);
        const newVal = { type: HeapType.Bool, data: !val.data } as const;
        es.jobState.getOS().push(newVal);
      };

    case "&":
      return (_, es) => {
        const val = es.jobState.getOS().pop();
        const newVal = {
          type: HeapType.BinaryPtr,
          child1: val.addr,
          child2: HeapAddr.getNull(),
        } as const;
        es.jobState.getOS().push(newVal);
      };

    case "*":
      return (_, es) => {
        const val = es.jobState.getOS().pop();
        assertGoslingType(HeapType.BinaryPtr, val);
        const newValAddr = val.child1;
        es.jobState.getOS().push(newValAddr);
      };

    case "<-":
      return (_, es) => {
        throw new Error(`Unary ${key} should not be executed here`);
      };

    default: {
      const _: never = key;
      throw new Error(`Unary operator ${key} not valid`);
    }
  }
}

const peekLastType = (es: ExecutionState) => es.jobState.getOS().peek().type;
const getLastTwo = (es: ExecutionState) => {
  const _1 = es.jobState.getOS().pop();
  const _2 = es.jobState.getOS().pop();
  return [_1, _2];
};
const useLastTwoAsInts = (
  es: ExecutionState,
  op: string
): Literal<GoslingIntObj> => {
  const [val1, val2] = getLastTwo(es);
  if (val1.type !== HeapType.Int || val2.type !== HeapType.Int)
    throw new Error(`Bad types for op ${op}: ${val1.type}, ${val2.type}`);

  const fn: Record<string, (a: number, b: number) => number> = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => Math.floor(a / b),
    "%": (a, b) => a % b,
  };

  if (!fn[op]) throw new Error(`Binary operator ${op} not implemented`);

  return makeInt(fn[op](val1.data, val2.data));
};
const makeInt = (data: number) => ({ type: HeapType.Int, data }) as const;
const makeBool = (data: boolean) => ({ type: HeapType.Bool, data }) as const;
const makeCompResult = (op: string, es: ExecutionState) => {
  const data: [number, number] | [string, string] | [boolean, boolean] =
    (() => {
      const [_1, _2] = getLastTwo(es);

      if (_1.type === HeapType.Int && _2.type === HeapType.Int)
        return [_1.data, _2.data];
      if (_1.type === HeapType.String && _2.type === HeapType.String)
        return [_1.data, _2.data];
      if (_1.type === HeapType.Bool && _2.type === HeapType.Bool)
        return [_1.data, _2.data];
      if (_1.type === HeapType.BinaryPtr && _2.type === HeapType.BinaryPtr)
        return [_1.child1.toNum(), _2.child1.toNum()];

      throw new Error(`Bad types for binary op ${op}: ${_1.type}, ${_2.type}`);
    })();
  const [a, b] = data;
  switch (op) {
    case "==":
      return makeBool(a === b);
    case "!=":
      return makeBool(a !== b);
    case "<=":
      return makeBool(a <= b);
    case "<":
      return makeBool(a < b);
    case ">=":
      return makeBool(a >= b);
    case ">":
      return makeBool(a > b);
    default:
      throw new Error(`Comp operator ${op} not valid`);
  }
};

export function getBinaryOpLogic(
  key: BinaryOpSymbol
): (ins: AnyInstructionObj, es: ExecutionState) => void {
  switch (key) {
    case "==":
    case "!=":
    case "<=":
    case "<":
    case ">=":
    case ">":
      return (_, es) => es.jobState.getOS().push(makeCompResult(key, es));

    case "+":
      return (_, es) => {
        if (peekLastType(es) === HeapType.Int) {
          return es.jobState.getOS().push(useLastTwoAsInts(es, key));
        }

        const [val1, val2] = getLastTwo(es);

        if (val1.type !== HeapType.String || val2.type !== HeapType.String)
          throw new Error(
            `Bad types for binary op ${key}: ${val1.type}, ${val2.type}`
          );

        const newVal = {
          type: HeapType.String,
          data: (val1.data + val2.data).replace(/\0/g, ""),
        } as const;
        return es.jobState.getOS().push(newVal);
      };

    case "-":
    case "*":
    case "/":
    case "%":
      return (_, es) => es.jobState.getOS().push(useLastTwoAsInts(es, key));

    case "&":
    case "&^":
    case "|":
    case "^":
    case "<<":
    case ">>":
      throw new Error(`Binary operator ${key} not implemented`);

    default: {
      const _: never = key;
      throw new Error(`Binary operator ${key} not valid`);
    }
  }
}
