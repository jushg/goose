import { IUntypedAllocator } from ".";
import { MemoryManager } from "./manager";

describe('Memory Manager', () => {
  const createJestAllocAndMgr = () => {
    const jestAlloc: IUntypedAllocator = {
      getNewHeapAddress: jest.fn(),
      getNewHeapAddresses: jest.fn(),
      setHeapValueInBytes: jest.fn(),
      getHeapValueInBytes: jest.fn(),
      printHeap: jest.fn(),
      getNodeCount: jest.fn(),
    }

    return { jestAlloc, memory: new MemoryManager(jestAlloc)};
  }

  test('should create a new memory manager', () => {
    const { memory } = createJestAllocAndMgr();
    expect(memory).toBeDefined();
  })

});
