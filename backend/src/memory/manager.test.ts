import { HEAP_NODE_BYTE_TOTAL_SIZE } from ".";
import { SimpleMemoryAllocator } from "./alloc";
import { MemoryManager } from "./manager";

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
  let manager: MemoryManager;
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
    manager = new MemoryManager(memAlloc);
  });

  test("should create a new memory manager", () => {
    expect(manager).toBeDefined();
  });

  test("should get the node count", () => {
    expect(manager.getNodeCount()).toBe(nodeCount);
    expect(spy.getNodeCount).toHaveBeenCalled();
  });
});
