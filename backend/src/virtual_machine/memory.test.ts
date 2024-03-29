import {
  AnyGoslingObject,
  GoslingBinaryPtrObj,
  GoslingIntObj,
  assertGoslingType,
} from ".";
import { InstrAddr } from "../instruction/base";
import { Allocator, HeapAddr, HeapType, createHeapManager } from "../memory";
import { GoslingMemoryManager } from "./memory";

describe("GoslingMemoryManager", () => {
  const createCompoundSpy = (obj: any, methods: string[]) => {
    // Return a map of method names to spies
    return methods.reduce(
      (acc: Record<string, jest.SpyInstance>, method: string) => {
        acc[method] = jest.spyOn(obj, method);
        return acc;
      },
      {}
    );
  };

  let spy: Record<string, jest.SpyInstance>;
  let allocator: Allocator;
  const nodeCount = 1000;
  let memoryManager: GoslingMemoryManager;

  beforeEach(() => {
    allocator = createHeapManager(nodeCount);
    spy = createCompoundSpy(allocator, [
      "getNewHeapAddress",
      "getNewHeapAddresses",
      "setHeapValueInBytes",
      "getHeapValueInBytes",
      "printHeap",
      "getNodeCount",

      // IAllocator specific
      "getHeapValue",
      "setHeapValue",
      "allocBool",
      "allocInt",
      "allocString",
      "allocBinaryPtr",
    ]);
    memoryManager = new GoslingMemoryManager(allocator);
  });

  describe("alloc and get", () => {
    it("should return null for a null address", () => {
      const addr: HeapAddr = HeapAddr.getNull();
      expect(addr.isNull()).toBe(true);
      const result: AnyGoslingObject | null = memoryManager.get(addr);
      expect(result).toBeNull();
    });

    it("should allocate bool correctly", () => {
      const datum = [true, false];
      const literals = datum.map((data) => {
        return { type: HeapType.Bool as const, data };
      });
      const allocatedAddresses = literals.map(
        (data) => memoryManager.alloc(data).addr
      );

      // assert not null
      const values = allocatedAddresses.forEach((addr, idx) => {
        expect(addr.isNull()).toBe(false);
        const result: AnyGoslingObject | null = memoryManager.get(addr);
        expect(result).not.toBeNull();
        assertGoslingType(HeapType.Bool, result!);
        expect(result.data).toBe(datum[idx]);
      });
    });

    it("should allocate int correctly", () => {
      const datum = [1, 2, -1, -2, 0, 100, -100, 1000000, -1000000];
      const literals = datum.map((data) => {
        return { type: HeapType.Int as const, data };
      });
      const allocatedAddresses = literals.map(
        (data) => memoryManager.alloc(data).addr
      );

      // assert not null
      const values = allocatedAddresses.forEach((addr, idx) => {
        expect(addr.isNull()).toBe(false);
        const result: AnyGoslingObject | null = memoryManager.get(addr);
        expect(result).not.toBeNull();
        assertGoslingType(HeapType.Int, result!);
        expect(result.data).toBe(datum[idx]);
      });
    });

    it("should allocate string correctly", () => {
      const datum = [
        "a",
        "hi",
        "b\n''coo  cooooooc",
        "iiiiiiiiiiiiiiiiiiiiiiiiiiii\niiiiiiiiiiiiiiiiiiii\niiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
      ];
      const literals = datum.map((data) => {
        return { type: HeapType.String as const, data };
      });
      const allocatedAddresses = literals.map(
        (data) => memoryManager.alloc(data).addr
      );

      // assert not null
      const values = allocatedAddresses.forEach((addr, idx) => {
        expect(addr.isNull()).toBe(false);
        const result: AnyGoslingObject | null = memoryManager.get(addr);
        expect(result).not.toBeNull();
        assertGoslingType(HeapType.String, result!);
        expect(result.data).toBe(datum[idx]);
      });
    });

    it("should allocate binary pointer correctly", () => {
      const datum = [
        HeapAddr.getNull(),
        HeapAddr.fromNum(1),
        HeapAddr.fromNum(2),
        HeapAddr.fromNum(40),
        HeapAddr.fromNum(99),
      ].flatMap((a) =>
        [
          HeapAddr.getNull(),
          HeapAddr.fromNum(1),
          HeapAddr.fromNum(2),
          HeapAddr.fromNum(40),
          HeapAddr.fromNum(99),
        ].map((b) => [a, b])
      );
      const literals = datum.map((a) => {
        return {
          type: HeapType.BinaryPtr as const,
          child1: a[0],
          child2: a[1],
        };
      });
      const allocatedAddresses = literals.map(
        (data) => memoryManager.alloc(data).addr
      );

      // assert not null
      const values = allocatedAddresses.forEach((addr, idx) => {
        expect(addr.isNull()).toBe(false);
        const result: AnyGoslingObject | null = memoryManager.get(addr);
        expect(result).not.toBeNull();
        assertGoslingType(HeapType.BinaryPtr, result!);
        expect(result.child1.addr).toBe(datum[idx][0].addr);
        expect(result.child2.addr).toBe(datum[idx][1].addr);
      });
    });
  });

  describe("set and get", () => {
    it("should set bool correctly", () => {
      const datum = [true, false];
      const literals = datum.map((data) => {
        return { type: HeapType.Bool as const, data };
      });
      const allocatedAddresses = literals.map(() =>
        memoryManager.memory.allocBinaryPtr(HeapAddr.getNull())
      );
      literals.forEach((data, idx) => {
        memoryManager.set(allocatedAddresses[idx], data);
      });

      // assert not null
      const values = allocatedAddresses.forEach((addr, idx) => {
        expect(addr.isNull()).toBe(false);
        const result: AnyGoslingObject | null = memoryManager.get(addr);
        expect(result).not.toBeNull();
        assertGoslingType(HeapType.Bool, result!);
        expect(result.data).toBe(datum[idx]);
      });
    });

    it("should allocate int correctly", () => {
      const datum = [1, 2, -1, -2, 0, 100, -100, 1000000, -1000000];
      const literals = datum.map((data) => {
        return { type: HeapType.Int as const, data };
      });
      const allocatedAddresses = literals.map(() =>
        memoryManager.memory.allocBinaryPtr(HeapAddr.getNull())
      );
      literals.forEach((data, idx) => {
        memoryManager.set(allocatedAddresses[idx], data);
      });

      // assert not null
      const values = allocatedAddresses.forEach((addr, idx) => {
        expect(addr.isNull()).toBe(false);
        const result: AnyGoslingObject | null = memoryManager.get(addr);
        expect(result).not.toBeNull();
        assertGoslingType(HeapType.Int, result!);
        expect(result.data).toBe(datum[idx]);
      });
    });

    it("should allocate string correctly", () => {
      const datum = [
        "a",
        "hi",
        "b\n''coo  cooooooc",
        "iiiiiiiiiiiiiiiiiiiiiiiiiiii\niiiiiiiiiiiiiiiiiiii\niiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
      ];
      const literals = datum.map((data) => {
        return { type: HeapType.String as const, data };
      });
      const allocatedAddresses = literals.map(() =>
        memoryManager.memory.allocBinaryPtr(HeapAddr.getNull())
      );
      literals.forEach((data, idx) => {
        memoryManager.set(allocatedAddresses[idx], data);
      });

      // assert not null
      const values = allocatedAddresses.forEach((addr, idx) => {
        expect(addr.isNull()).toBe(false);
        const result: AnyGoslingObject | null = memoryManager.get(addr);
        expect(result).not.toBeNull();
        assertGoslingType(HeapType.String, result!);
        expect(result.data).toBe(datum[idx]);
      });
    });

    it("should allocate binary pointer correctly", () => {
      const datum = [
        HeapAddr.getNull(),
        HeapAddr.fromNum(1),
        HeapAddr.fromNum(2),
        HeapAddr.fromNum(40),
        HeapAddr.fromNum(99),
      ].flatMap((a) =>
        [
          HeapAddr.getNull(),
          HeapAddr.fromNum(1),
          HeapAddr.fromNum(2),
          HeapAddr.fromNum(40),
          HeapAddr.fromNum(99),
        ].map((b) => [a, b])
      );
      const literals = datum.map((a) => {
        return {
          type: HeapType.BinaryPtr as const,
          child1: a[0],
          child2: a[1],
        };
      });
      const allocatedAddresses = literals.map(() =>
        memoryManager.memory.allocBinaryPtr(HeapAddr.getNull())
      );
      literals.forEach((data, idx) => {
        memoryManager.set(allocatedAddresses[idx], data);
      });

      // assert not null
      const values = allocatedAddresses.forEach((addr, idx) => {
        expect(addr.isNull()).toBe(false);
        const result: AnyGoslingObject | null = memoryManager.get(addr);
        expect(result).not.toBeNull();
        assertGoslingType(HeapType.BinaryPtr, result!);
        expect(result.child1.addr).toBe(datum[idx][0].addr);
        expect(result.child2.addr).toBe(datum[idx][1].addr);
      });
    });
  });

  describe("alloc and get lambda and scopes", () => {
    it("should allocate lambda correctly for empty closure", () => {
      const closureAddr = HeapAddr.getNull();
      const pcAddr = InstrAddr.fromNum(100);
      const allocatedAddress = memoryManager.allocLambda(closureAddr, pcAddr);

      // assert not null
      expect(allocatedAddress.isNull()).toBe(false);
      const result: AnyGoslingObject | null =
        memoryManager.get(allocatedAddress);
      expect(result).not.toBeNull();
      assertGoslingType(HeapType.BinaryPtr, result!);
      expect(result.child1.addr).toBe(closureAddr.addr);
      expect((memoryManager.get(result.child2)! as any).data).toBe(pcAddr.addr);
    });

    it("should allocate non empty closures correctly", () => {
      let scopeObj = memoryManager.getEnvs(HeapAddr.getNull());
      expect(scopeObj.getTopScopeAddr().isNull()).toBeTruthy();

      scopeObj = memoryManager.allocNewFrame(scopeObj, {
        g: { type: HeapType.Int, data: 1 },
      });
      expect(scopeObj.getTopScopeAddr().isNull()).toBeFalsy();
      {
        const x = scopeObj.lookup("g")!;
        assertGoslingType(HeapType.Int, x);
        expect(x.data).toBe(1);
      }

      const f1 = {
        foo: { type: HeapType.Int, data: 1 },
        bar: {
          type: HeapType.BinaryPtr,
          child1: HeapAddr.fromNum(1),
          child2: HeapAddr.fromNum(8),
        },
        baz: {
          type: HeapType.String,
          data: "sldkfjsdlkfjsdlfkjsdlkfjsld\ndfnsldkfjhlgkjslkdgjklsdgjsklgjdklkfjdsklj",
        },
      } as const;

      const caller1PC = InstrAddr.fromNum(100);
      const caller1RTS = scopeObj.getTopScopeAddr();
      const f1Addr = memoryManager
        .allocNewFrame(scopeObj, f1)
        .getTopScopeAddr();
      scopeObj = memoryManager.allocNewJumpFrame(caller1PC, scopeObj, f1Addr);
      expect((scopeObj.lookup("__callerPC") as GoslingIntObj).data).toBe(
        caller1PC.addr
      );
      expect(
        (scopeObj.lookup("__callerRTS") as GoslingBinaryPtrObj).child1.addr
      ).toBe(caller1RTS.addr);
      {
        const x = scopeObj.lookup("foo")!;
        assertGoslingType(HeapType.Int, x);
        expect(x.data).toBe(f1.foo.data);
      }
      {
        const x = scopeObj.lookup("bar")!;
        assertGoslingType(HeapType.BinaryPtr, x);
        expect(x.child1.addr).toBe(f1.bar.child1.addr);
        expect(x.child2.addr).toBe(f1.bar.child2.addr);
      }
      {
        const x = scopeObj.lookup("baz")!;
        assertGoslingType(HeapType.String, x);
        expect(x.data).toBe(f1.baz.data);
      }

      // Dry Run exit scope
      {
        const { callerPC, enclosing } =
          memoryManager.getEnclosingFrame(scopeObj);
        expect(callerPC?.addr).toBe(caller1PC.addr);
        expect(enclosing.getTopScopeAddr().addr).toBe(caller1RTS.addr);
        // scopeObj = enclosing;

        // Note, usually here we would reset scopeObj = enclosing, but we want to stay in the call for
        // f2, which will be a nested scope inside f1.
      }

      const f2 = {
        foo: { type: HeapType.String, data: "alskdfjl asldkf  sdfklj" },
        bar: {
          type: HeapType.BinaryPtr,
          child1: HeapAddr.fromNum(1),
          child2: HeapAddr.fromNum(80),
        },
        bay: {
          type: HeapType.String,
          data: "sldkfjsdlkfjsdlfkjsdlkfjsld\ndfnsldkfjhlgkjslkdgjklsdgjsklgjdklkfjdsklj",
        },
      } as const;

      const preF2Addr = scopeObj.getTopScopeAddr();
      scopeObj = memoryManager.allocNewFrame(scopeObj, f2);
      const f2Addr = scopeObj.getTopScopeAddr();
      expect(f2Addr.addr).not.toBe(f1Addr.addr);

      {
        const x = scopeObj.lookup("foo")!;
        assertGoslingType(HeapType.String, x);
        expect(x.data).toBe(f2.foo.data);
      }
      {
        const x = scopeObj.lookup("bar")!;
        assertGoslingType(HeapType.BinaryPtr, x);
        expect(x.child1.addr).toBe(f2.bar.child1.addr);
        expect(x.child2.addr).toBe(f2.bar.child2.addr);
      }
      {
        const x = scopeObj.lookup("baz")!;
        assertGoslingType(HeapType.String, x);
        expect(x.data).toBe(f1.baz.data);
      }
      {
        const x = scopeObj.lookup("bay")!;
        assertGoslingType(HeapType.String, x);
        expect(x.data).toBe(f2.bay.data);
      }

      // Exit scope back to callee f1
      {
        const { callerPC, enclosing } =
          memoryManager.getEnclosingFrame(scopeObj);
        expect(callerPC).toBeNull();
        expect(enclosing.getTopScopeAddr().addr).toBe(preF2Addr.addr);

        scopeObj = enclosing;
      }

      const caller2PC = InstrAddr.fromNum(128);
      const caller2RTS = scopeObj.getTopScopeAddr();
      scopeObj = memoryManager.allocNewJumpFrame(caller2PC, scopeObj, f1Addr);
      expect((scopeObj.lookup("__callerPC") as GoslingIntObj).data).toBe(
        caller2PC.addr
      );
      expect(
        (scopeObj.lookup("__callerRTS") as GoslingBinaryPtrObj).child1.addr
      ).toBe(caller2RTS.addr);

      {
        const x = scopeObj.lookup("foo")!;
        assertGoslingType(HeapType.Int, x);
        expect(x.data).toBe(f1.foo.data);
      }
      {
        const x = scopeObj.lookup("bar")!;
        assertGoslingType(HeapType.BinaryPtr, x);
        expect(x.child1.addr).toBe(f1.bar.child1.addr);
        expect(x.child2.addr).toBe(f1.bar.child2.addr);
      }
      {
        const x = scopeObj.lookup("baz")!;
        assertGoslingType(HeapType.String, x);
        expect(x.data).toBe(f1.baz.data);
      }

      // Exit scope back to one level above
      {
        const { callerPC, enclosing } =
          memoryManager.getEnclosingFrame(scopeObj);
        expect(callerPC?.addr).toBe(caller2PC.addr);
        scopeObj = enclosing;
      }

      // Exit scope back to one level above
      {
        const { callerPC, enclosing } =
          memoryManager.getEnclosingFrame(scopeObj);
        expect(callerPC?.addr).toBe(caller1PC.addr);
        scopeObj = enclosing;
      }
    });
  });
});
