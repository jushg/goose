import { HeapAddr, HeapType, IAllocator, createHeapManager } from "../memory";
import { GoslingMemoryManager } from "./alloc";
import { AnyGoslingObject, assertGoslingType, isGoslingType } from "./memory";

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
  const nodeCount = 100;
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

  describe("get / alloc", () => {
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

  // TODO: Add more tests for the envs, lists, lambda
});
