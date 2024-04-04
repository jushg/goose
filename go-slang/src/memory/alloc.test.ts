import { HEAP_NODE_BYTE_SIZE, HEAP_NODE_BYTE_TOTAL_SIZE } from ".";
import { Allocator } from "./alloc";
import { GcFlag, HeapType } from "./node";
import { SimpleMemoryAllocator } from "./untypedAlloc";

describe("Memory Manager", () => {
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

  let memAlloc: SimpleMemoryAllocator;
  let spy: Record<string, jest.SpyInstance>;
  let manager: Allocator;
  const nodeCount = 100;

  beforeEach(() => {
    memAlloc = new SimpleMemoryAllocator({
      nodeCount,
      buf: new ArrayBuffer(100 * HEAP_NODE_BYTE_TOTAL_SIZE),
    });
    spy = createCompoundSpy(memAlloc, [
      "getNewHeapAddress",
      "getNewHeapAddresses",
      "setHeapValueInBytes",
      "getHeapValueInBytes",
      "printHeap",
      "getNodeCount",
    ]);
    manager = new Allocator(memAlloc);
  });

  test("should create a new memory manager", () => {
    expect(manager).toBeDefined();
  });

  test("should get the node count", () => {
    expect(manager.getNodeCount()).toBe(nodeCount);
    expect(spy.getNodeCount).toHaveBeenCalled();
  });

  test("should get a new heap address", () => {
    const addr = manager.getNewHeapAddress();
    expect(addr).toBeDefined();
    expect(spy.getNewHeapAddress).toHaveBeenCalled();
  });

  test("should get new heap addresses", () => {
    const size = 5;
    const addresses = manager.getNewHeapAddresses(size);
    expect(addresses).toHaveLength(size);
    addresses.forEach((addr) => expect(addr).toBeDefined());
    expect(spy.getNewHeapAddresses).toHaveBeenCalledWith(size);
  });

  test("should set heap value in bytes", () => {
    const addr = manager.getNewHeapAddress();
    const val = [1, 2, 3, 4, 5, 6, 7, 8];

    manager.setHeapValueInBytes(addr, val);

    expect(spy.setHeapValueInBytes).toHaveBeenCalledWith(addr, val);
  });

  test("should get heap value in bytes", () => {
    const addr = manager.getNewHeapAddress();
    const val = [1, 2, 3, 4, 5, 6, 7, 8];

    manager.setHeapValueInBytes(addr, val);

    expect(manager.getHeapValueInBytes(addr)).toEqual(val);
    expect(spy.getHeapValueInBytes).toHaveBeenCalledWith(addr);
  });

  test("should be able to alloc and later read a boolean", () => {
    const values = [true, false];
    for (const val of values) {
      const addr = manager.allocBool(val);
      const node = manager.getHeapValue(addr);
      expect(node.toHeapValue()).toEqual({
        type: HeapType.Bool,
        gcFlag: GcFlag.Unmarked,
        data: val,
      });
    }
  });

  test("should be able to alloc and later read an int", () => {
    const values = [0, -1, 1, 2, 16, -2, -16, 10000, -10000];
    for (const val of values) {
      const addr = manager.allocInt(val);
      const node = manager.getHeapValue(addr);
      const value = node.toHeapValue();
      expect(node.toHeapValue()).toEqual({
        type: HeapType.Int,
        gcFlag: GcFlag.Unmarked,
        data: val,
      });
    }
  });

  test("should be able to alloc and later read a single-node string", () => {
    const values = ["", "abc", "g\nf", "a a"];
    for (const val of values) {
      const addr = manager.allocString(val);
      const node = manager.getHeapValue(addr);
      const value = node.toHeapValue();

      expect(value).toBeDefined();
      expect(value).toHaveProperty("type", HeapType.String);
      expect(value).toHaveProperty("gcFlag", GcFlag.Unmarked);
      expect(value).toHaveProperty("data");
      expect((value as any).data.replace(/\0/g, "")).toEqual(val);
    }
  });

  test("should be able to alloc and later read a multi-node string", () => {
    const values = [
      "a".repeat(HEAP_NODE_BYTE_SIZE.data * 2),
      "a".repeat(HEAP_NODE_BYTE_SIZE.data * 3),
      "a".repeat(HEAP_NODE_BYTE_SIZE.data * 4),
      "Blood and darkness",
    ];

    for (const val of values) {
      let addr = manager.allocString(val);
      let concatenated = "";
      let node;

      while (addr.isNull() === false) {
        expect(addr).toHaveProperty("addr");

        node = manager.getHeapValue(addr);
        const value = node.toHeapValue();

        expect(value).toBeDefined();
        expect(value).toHaveProperty("type", HeapType.String);
        expect(value).toHaveProperty("gcFlag", GcFlag.Unmarked);

        expect(value).toHaveProperty("next");
        addr = (value as any).next;

        expect(value).toHaveProperty("data");
        concatenated += (value as any).data;
      }

      expect(concatenated.replace(/\0/g, "")).toEqual(val);
    }
  });
});
