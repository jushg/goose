import { HEAP_NODE_BYTE_SIZE } from ".";
import { GcFlag, HeapAddr, HeapInBytes, HeapType, HeapValue } from "./node";

describe("HeapInBytes", () => {
  const stringNormalizer = (s: string): string => {
    return s.replace(/\0/g, "");
  };

  test("should correctly set heap bytes", () => {
    const tag = 1;
    const child = new Array(HEAP_NODE_BYTE_SIZE.child).map(
      (_, idx) => idx + 50
    ); // Assuming this is not the expected size
    const data = new Array(HEAP_NODE_BYTE_SIZE.data).map((_, idx) => idx + 80);

    expect(HeapInBytes.fromBytes([tag, ...child, ...data])._bytes).toEqual([
      tag,
      ...child,
      ...data,
    ]);
  });

  test("should throw error for invalid byte size", () => {
    const bytes = [1, 2, 3]; // Assuming this is not the expected size

    expect(() => HeapInBytes.fromBytes([...bytes])).toThrow(
      `Invalid byte size: ${bytes.length}`
    );
  });

  test("should correctly convert tag byte to type and gcFlag", () => {
    const types: HeapType[] = Object.values(HeapType);
    const gcFlags: GcFlag[] = Object.values(GcFlag);

    for (const type of types) {
      for (const gcFlag of gcFlags) {
        const tag = HeapInBytes.toTagByte(type, gcFlag);
        const { type: t, gcFlag: g } = HeapInBytes.fromTagByte(tag);

        expect(t).toEqual(type);
        expect(g).toEqual(gcFlag);
      }
    }
  });

  test("should correctly convert numbers to bytes", () => {
    const simpleData = [0, -1, 1, 2, 16, -2, -16, 10000, -10000];
    for (const data of simpleData) {
      const h = HeapInBytes.fromData({
        type: HeapType.Int,
        gcFlag: GcFlag.Unmarked,
        data,
      });
      const bytes = h.toBytes();
      const converted = HeapInBytes.fromBytes(bytes).toHeapValue() as any;
      expect(converted.data).toEqual(data);
      expect(converted.child).toBeUndefined();
    }
  });

  test("should correctly convert boolean to bytes", () => {
    const simpleData = [true, false];
    for (const data of simpleData) {
      const h = HeapInBytes.fromData({
        type: HeapType.Bool,
        gcFlag: GcFlag.Unmarked,
        data,
      });
      const bytes = h.toBytes();
      const converted = HeapInBytes.fromBytes(bytes).toHeapValue() as any;
      expect(converted.data).toEqual(data);
      expect(converted.child).toBeUndefined();
    }
  });

  test("should correctly convert string to bytes", () => {
    const simpleData = ["", "abc", "g\nf", "a a"];
    for (const data of simpleData) {
      const next = HeapAddr.fromNum(6);
      const h = HeapInBytes.fromData({
        type: HeapType.String,
        gcFlag: GcFlag.Unmarked,
        data,
        next,
      });
      const bytes = h.toBytes();
      const converted = HeapInBytes.fromBytes(
        bytes
      ).toHeapValue() as HeapValue<HeapType.String>;
      expect(stringNormalizer(converted.data)).toStrictEqual(
        stringNormalizer(data)
      );
      expect(converted.next).toStrictEqual(next);
    }
  });

  test("should correctly convert list node to bytes", () => {
    const child1 = HeapAddr.fromNum(9);
    const child2 = HeapAddr.fromNum(10);
    const h = HeapInBytes.fromData({
      type: HeapType.BinaryPtr,
      gcFlag: GcFlag.Unmarked,
      child1,
      child2,
    });
    const bytes = h.toBytes();
    const converted = HeapInBytes.fromBytes(
      bytes
    ).toHeapValue() as HeapValue<HeapType.BinaryPtr>;
    expect(converted.child1).toStrictEqual(child1);
    expect(converted.child2).toStrictEqual(child2);
  });
});
