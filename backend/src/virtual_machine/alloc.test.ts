import { assertGoslingType } from ".";
import { InstrAddr } from "../instruction/base";
import { HeapAddr, HeapType, IAllocator, createHeapManager } from "../memory";
import { GoslingMemoryManager } from "./alloc";
import { AnyGoslingObject, GoslingBinaryPtrObj, GoslingIntObj } from "./memory";

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
  let allocator: IAllocator;
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

      const callee1PC = InstrAddr.fromNum(124);
      const callee1RTS = HeapAddr.fromNum(53);
      scopeObj = scopeObj.allocNewFrame(callee1PC, callee1RTS, {});
      expect(scopeObj.getTopScopeAddr().isNull()).toBeFalsy();
      expect((scopeObj.lookup("__callerPC") as GoslingIntObj).data).toBe(
        callee1PC.addr
      );
      expect(
        (scopeObj.lookup("__callerRTS") as GoslingBinaryPtrObj).child1.addr
      ).toBe(callee1RTS.addr);

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
      const callee2PC = InstrAddr.fromNum(128);
      const callee2RTS = HeapAddr.fromNum(57);
      scopeObj = scopeObj.allocNewFrame(callee2PC, callee2RTS, f1);
      expect((scopeObj.lookup("__callerPC") as GoslingIntObj).data).toBe(
        callee2PC.addr
      );
      expect(
        (scopeObj.lookup("__callerRTS") as GoslingBinaryPtrObj).child1.addr
      ).toBe(callee2RTS.addr);
      const f1Addr = scopeObj.getTopScopeAddr();
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

      const callee3PC = InstrAddr.fromNum(135);
      const callee3RTS = HeapAddr.fromNum(64);
      scopeObj = scopeObj.allocNewFrame(callee3PC, callee3RTS, f2);
      expect((scopeObj.lookup("__callerPC") as GoslingIntObj).data).toBe(
        callee3PC.addr
      );
      expect(
        (scopeObj.lookup("__callerRTS") as GoslingBinaryPtrObj).child1.addr
      ).toBe(callee3RTS.addr);

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

      scopeObj = scopeObj.getEnclosingScope();
      expect(scopeObj.getTopScopeAddr().addr).toBe(f1Addr.addr);
      expect((scopeObj.lookup("__callerPC") as GoslingIntObj).data).toBe(
        callee2PC.addr
      );
      expect(
        (scopeObj.lookup("__callerRTS") as GoslingBinaryPtrObj).child1.addr
      ).toBe(callee2RTS.addr);
    });
  });
});
