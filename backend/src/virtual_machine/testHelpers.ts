import { MatcherFunction } from "expect";
import { HeapAddr } from "../memory";
import { AnyGoslingObject, GoslingListObj, Literal } from ".";
import { GoslingMemoryManager } from "./memory";
import { GoslingScopeData } from "./scope";

const toBeGoslingLiteralOf: MatcherFunction<[obj: unknown]> = function (
  _actual: unknown,
  _obj: unknown
) {
  // I'm not validating any further for this test utility.
  const actual = _actual as Literal<AnyGoslingObject>;
  const obj = _obj as Literal<AnyGoslingObject>;
  if (obj.type !== actual.type) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actual
        )} to be of type ${this.utils.printExpected(obj.type)}`,
      pass: false,
    };
  }

  // Ignore 'addr' key.
  const objKV = Object.keys({ ...obj, addr: null })
    .map((key) => [key, (obj as any)[key]])
    .sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });
  const actualKV = Object.keys({ ...obj, addr: null })
    .map((key) => [key, (actual as any)[key]])
    .sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });

  for (let propIdx = 0; propIdx < objKV.length; propIdx++) {
    const [key, value] = objKV[propIdx];
    const [actualKey, actualValue] = actualKV[propIdx];
    if (key !== actualKey && value !== actualValue) {
      return {
        message: () =>
          `expected ${this.utils.printReceived(actual)} to be ${this.utils.printExpected(obj)}`,
        pass: false,
      };
    }
  }

  return {
    message: () =>
      `expected ${this.utils.printReceived(actual)} to be ${this.utils.printExpected(obj)}`,
    pass: true,
  };
};

const toBeGoslingListOf: MatcherFunction<
  [objs: (HeapAddr | Literal<AnyGoslingObject> | null | "*")[]]
> = function (_actual: unknown, objs) {
  const actual = _actual as GoslingListObj;

  if (actual.length !== objs.length) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actual
        )} to be of length ${this.utils.printExpected(objs.length)}`,
      pass: false,
    };
  }

  for (let listIdx = 0; listIdx < actual.length; listIdx++) {
    const obj = objs[listIdx];
    if (typeof obj === "string" && obj === "*") {
      continue;
    }

    const actualObj = actual[listIdx].value;
    if (obj === null && actualObj !== null) {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            actualObj
          )} to be ${this.utils.printExpected(null)}`,
        pass: false,
      };
    }

    if (obj === null) {
      // actualObj must be null here due to prev check.
      continue;
    }

    if (actualObj === null) {
      return {
        message: () =>
          `expected ${this.utils.printReceived(actualObj)} to be ${this.utils.printExpected(obj)}`,
        pass: false,
      };
    }

    if (obj instanceof HeapAddr) {
      if (actualObj.addr.addr !== obj.addr) {
        return {
          message: () =>
            `expected address of ${this.utils.printReceived(
              actualObj
            )} to be ${this.utils.printExpected(obj.toString())} instead of ${this.utils.printReceived(
              actualObj.addr.toString()
            )}`,
          pass: false,
        };
      } else {
        continue;
      }
    }

    const res = toBeGoslingLiteralOf.call(this, actualObj, obj);
    if ((res as any).pass) continue;
    return res; // toBeGoslingLiteralOf failure
  }

  return {
    message: () =>
      // `this` context will have correct typings
      `expected ${this.utils.printReceived(
        actual
      )} not to be within range ${this.utils.printExpected(``)}`,
    pass: true,
  };
};

const toHaveMemoryOf: MatcherFunction<
  [addr: HeapAddr, literal: Literal<AnyGoslingObject>]
> = function (_memory: unknown, addr, literal) {
  const memory = _memory as GoslingMemoryManager;
  const obj = memory.get(addr);
  if (!obj) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(addr)} to be in memory`,
      pass: false,
    };
  }

  return toBeGoslingLiteralOf.call(this, obj, literal);
};

const toBeScopeDataOf: MatcherFunction<
  [
    expectedScope: (
      | "*"
      | Record<string, "*" | null | Literal<AnyGoslingObject> | HeapAddr>
    )[],
  ]
> = function (_actual: unknown, expectedScope) {
  const actual = _actual as GoslingScopeData;
  if (actual.length !== expectedScope.length) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actual
        )} to be of length ${this.utils.printExpected(expectedScope.length)}`,
      pass: false,
    };
  }

  for (let scopeIdx = 0; scopeIdx < actual.length; scopeIdx++) {
    const env = actual[scopeIdx].env;
    const expectedEnv = expectedScope[scopeIdx];
    if (typeof expectedEnv === "string" && expectedEnv === "*") {
      continue;
    }

    if (
      Object.keys(env).sort().join(",") !==
      Object.keys(expectedEnv).sort().join(",")
    ) {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            env
          )} to have keys ${this.utils.printExpected(Object.keys(expectedEnv))}`,
        pass: false,
      };
    }

    for (const key in env) {
      const expectedValue = expectedEnv[key];
      const actualValue = env[key].valueObj;
      if (expectedValue === "*") {
        continue;
      }

      if (expectedValue === null && actualValue !== null) {
        return {
          message: () =>
            `expected ${this.utils.printReceived(
              actualValue
            )} to be ${this.utils.printExpected(null)}`,
          pass: false,
        };
      }

      if (actualValue === null) {
        return {
          message: () =>
            `expected ${this.utils.printReceived(
              actualValue
            )} to be ${this.utils.printExpected(expectedValue)}`,
          pass: false,
        };
      }

      if (expectedValue instanceof HeapAddr) {
        if (actualValue.addr.addr !== expectedValue.addr) {
          return {
            message: () =>
              `expected address of ${this.utils.printReceived(
                actualValue
              )} to be ${this.utils.printExpected(expectedValue.toString())} instead of ${this.utils.printReceived(
                actualValue.addr.toString()
              )}`,
            pass: false,
          };
        } else {
          continue;
        }
      }

      const res = toBeGoslingLiteralOf.call(this, actualValue, expectedValue);
      if ((res as any).pass) continue;
      return res; // toBeGoslingLiteralOf failure
    }
  }

  return {
    message: () =>
      // `this` context will have correct typings
      `expected ${this.utils.printReceived(
        actual
      )} to be scope data of ${this.utils.printExpected(expectedScope)}`,
    pass: true,
  };
};

expect.extend({
  toBeGoslingLiteralOf,
  toBeGoslingListOf,
  toHaveMemoryOf,
  toBeScopeDataOf,
});

declare module "expect" {
  interface AsymmetricMatchers {
    toBeGoslingLiteralOf(obj: Literal<AnyGoslingObject>): void;
    toBeGoslingListOf(
      objs: (HeapAddr | Literal<AnyGoslingObject> | null | "*")[]
    ): void;
    toHaveMemoryOf(addr: HeapAddr, literal: Literal<AnyGoslingObject>): void;
    toBeScopeDataOf(
      expectedScope: (
        | "*"
        | Record<string, "*" | null | Literal<AnyGoslingObject> | HeapAddr>
      )[]
    ): void;
  }
  interface Matchers<R> {
    toBeGoslingLiteralOf(obj: Literal<AnyGoslingObject>): R;
    toBeGoslingListOf(
      objs: (HeapAddr | Literal<AnyGoslingObject> | null | "*")[]
    ): R;
    toHaveMemoryOf(addr: HeapAddr, literal: Literal<AnyGoslingObject>): R;
    toBeScopeDataOf(
      expectedScope: (
        | "*"
        | Record<string, "*" | null | Literal<AnyGoslingObject> | HeapAddr>
      )[]
    ): R;
  }
}

export default {};
