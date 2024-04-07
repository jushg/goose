import {
  AnyGoslingObject,
  GoslingBinaryPtrObj,
  GoslingIntObj,
  GoslingStringObj,
  assertGoslingType,
} from ".";
import { InstrAddr } from "../common/instructionObj";
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
  let standbyAllocator: Allocator;
  const nodeCount = 1000;
  let memoryManager: GoslingMemoryManager;

  beforeEach(() => {
    allocator = createHeapManager(nodeCount);
    standbyAllocator = createHeapManager(nodeCount);
    spy = createCompoundSpy(allocator, [
      "getNewHeapAddress",
      "getNewHeapAddresses",
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
    memoryManager = new GoslingMemoryManager(allocator, standbyAllocator);
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
        expect(result.child1.toNum()).toBe(datum[idx][0].toNum());
        expect(result.child2.toNum()).toBe(datum[idx][1].toNum());
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
        expect(result.child1.toNum()).toBe(datum[idx][0].toNum());
        expect(result.child2.toNum()).toBe(datum[idx][1].toNum());
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
      expect(result.child1.toNum()).toBe(closureAddr.toNum());
      expect((memoryManager.get(result.child2)! as any).data).toBe(pcAddr.addr);
    });

    it("should allocate non empty closures correctly", () => {
      let scopeObj = memoryManager.getEnvs(HeapAddr.getNull());
      expect(scopeObj.getTopScopeAddr().isNull()).toBeTruthy();

      scopeObj = memoryManager.allocNewFrame(scopeObj, ["g"]);
      expect(scopeObj.getTopScopeAddr().isNull()).toBeFalsy();
      {
        const x = scopeObj.lookup("g")!;
        expect(x).toBeNull();
      }
      scopeObj.assign("g", { type: HeapType.Int, data: 1 });
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
      const f1Addr = (() => {
        const f1Frame = memoryManager.allocNewFrame(scopeObj, Object.keys(f1));
        for (const [key, val] of Object.entries(f1)) {
          f1Frame.assign(key, val);
        }
        return f1Frame;
      })().getTopScopeAddr();

      scopeObj = memoryManager.allocNewCallFrame(caller1PC, scopeObj, f1Addr);
      expect((scopeObj.lookup("__label") as GoslingStringObj).data).toBe(
        "CALL"
      );
      expect((scopeObj.lookup("__pc") as GoslingIntObj).data).toBe(
        caller1PC.addr
      );
      expect(
        (scopeObj.lookup("__ptrToRts") as GoslingBinaryPtrObj).child1.toNum()
      ).toBe(caller1RTS.toNum());
      {
        const x = scopeObj.lookup("foo")!;
        assertGoslingType(HeapType.Int, x);
        expect(x.data).toBe(f1.foo.data);
      }
      {
        const x = scopeObj.lookup("bar")!;
        assertGoslingType(HeapType.BinaryPtr, x);
        expect(x.child1.toNum()).toBe(f1.bar.child1.toNum());
        expect(x.child2.toNum()).toBe(f1.bar.child2.toNum());
      }
      {
        const x = scopeObj.lookup("baz")!;
        assertGoslingType(HeapType.String, x);
        expect(x.data).toBe(f1.baz.data);
      }

      // Dry Run exit scope
      {
        const { pc, rts } = memoryManager.getEnclosingSpecialFrame(
          scopeObj,
          "CALL"
        );
        expect(pc.addr).toBe(caller1PC.addr);
        expect(rts.getTopScopeAddr().toNum()).toBe(caller1RTS.toNum());
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
      scopeObj = (() => {
        const f2Frame = memoryManager.allocNewFrame(scopeObj, Object.keys(f2));
        for (const [key, val] of Object.entries(f2)) {
          f2Frame.assign(key, val);
        }
        return f2Frame;
      })();
      const f2Addr = scopeObj.getTopScopeAddr();
      expect(f2Addr.toNum()).not.toBe(f1Addr.toNum());

      {
        const x = scopeObj.lookup("foo")!;
        assertGoslingType(HeapType.String, x);
        expect(x.data).toBe(f2.foo.data);
      }
      {
        const x = scopeObj.lookup("bar")!;
        assertGoslingType(HeapType.BinaryPtr, x);
        expect(x.child1.toNum()).toBe(f2.bar.child1.toNum());
        expect(x.child2.toNum()).toBe(f2.bar.child2.toNum());
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
        const enclosing = memoryManager.getEnclosingFrame(scopeObj);
        expect(enclosing.getTopScopeAddr().toNum()).toBe(preF2Addr.toNum());

        scopeObj = enclosing;
      }

      const caller2PC = InstrAddr.fromNum(128);
      const caller2RTS = scopeObj.getTopScopeAddr();
      scopeObj = memoryManager.allocNewCallFrame(caller2PC, scopeObj, f1Addr);
      expect((scopeObj.lookup("__label") as GoslingStringObj).data).toBe(
        "CALL"
      );
      expect((scopeObj.lookup("__pc") as GoslingIntObj).data).toBe(
        caller2PC.addr
      );
      expect(
        (scopeObj.lookup("__ptrToRts") as GoslingBinaryPtrObj).child1.toNum()
      ).toBe(caller2RTS.toNum());

      {
        const x = scopeObj.lookup("foo")!;
        assertGoslingType(HeapType.Int, x);
        expect(x.data).toBe(f1.foo.data);
      }
      {
        const x = scopeObj.lookup("bar")!;
        assertGoslingType(HeapType.BinaryPtr, x);
        expect(x.child1.toNum()).toBe(f1.bar.child1.toNum());
        expect(x.child2.toNum()).toBe(f1.bar.child2.toNum());
      }
      {
        const x = scopeObj.lookup("baz")!;
        assertGoslingType(HeapType.String, x);
        expect(x.data).toBe(f1.baz.data);
      }

      // Exit scope back to one level above
      {
        const { pc, rts } = memoryManager.getEnclosingSpecialFrame(
          scopeObj,
          "CALL"
        );
        expect(pc.addr).toBe(caller2PC.addr);
        scopeObj = rts;
      }

      // Exit scope back to one level above
      {
        const { pc, rts } = memoryManager.getEnclosingSpecialFrame(
          scopeObj,
          "CALL"
        );
        expect(pc.addr).toBe(caller1PC.addr);
        scopeObj = rts;
      }
    });
  });
});
