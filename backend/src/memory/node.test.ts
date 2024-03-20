import { HEAP_NODE_BYTE_SIZE } from ".";
import { InstrAddr } from "../instruction/base";
import { GcFlag, HeapAddr, HeapInBytes, Type } from "./node";

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
    const types: Type[] = Object.values(Type);
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
        type: Type.Int,
        gcFlag: GcFlag.Unmarked,
        data,
      });
      const bytes = h.toBytes();
      const converted = HeapInBytes.fromBytes(bytes).toData() as any;
      expect(converted.data).toEqual(data);
      expect(converted.child).toBeUndefined();
    }
  });

  test("should correctly convert boolean to bytes", () => {
    const simpleData = [true, false];
    for (const data of simpleData) {
      const h = HeapInBytes.fromData({
        type: Type.Bool,
        gcFlag: GcFlag.Unmarked,
        data,
      });
      const bytes = h.toBytes();
      const converted = HeapInBytes.fromBytes(bytes).toData() as any;
      expect(converted.data).toEqual(data);
      expect(converted.child).toBeUndefined();
    }
  });

  test("should correctly convert string to bytes", () => {
    const simpleData = ["", "abc", "g\nf", "a a"];
    for (const data of simpleData) {
      const nextAddr = HeapAddr.fromNum(6);
      const h = HeapInBytes.fromData({
        type: Type.String,
        gcFlag: GcFlag.Unmarked,
        data,
        child: nextAddr,
      });
      const bytes = h.toBytes();
      const converted = HeapInBytes.fromBytes(bytes).toData() as any;
      expect(stringNormalizer(converted.data)).toStrictEqual(
        stringNormalizer(data)
      );
      expect(converted.child).toStrictEqual(nextAddr);
    }
  });

  test("should correctly convert symbol to bytes", () => {
    const simpleData = ["g_g", "abc", "gf", "a-a"];
    for (const data of simpleData) {
      const nextAddr = HeapAddr.fromNum(9);
      const h = HeapInBytes.fromData({
        type: Type.Symbol,
        gcFlag: GcFlag.Unmarked,
        data,
        child: nextAddr,
      });
      const bytes = h.toBytes();
      const converted = HeapInBytes.fromBytes(bytes).toData() as any;
      expect(stringNormalizer(converted.data)).toStrictEqual(
        stringNormalizer(data)
      );
      expect(converted.child).toStrictEqual(nextAddr);
    }
  });

  test("should correctly convert lambda to bytes", () => {
    const nextAddr = HeapAddr.fromNum(9);
    const pcAddr = InstrAddr.fromNum(10);
    const h = HeapInBytes.fromData({
      type: Type.Lambda,
      gcFlag: GcFlag.Unmarked,
      data: pcAddr,
      child: nextAddr,
    });
    const bytes = h.toBytes();
    const converted = HeapInBytes.fromBytes(bytes).toData() as any;
    expect(converted.data).toStrictEqual(pcAddr);
    expect(converted.child).toStrictEqual(nextAddr);
  });

  test("should correctly convert frameAddr to bytes", () => {
    const nextAddr = HeapAddr.fromNum(9);
    const dataAddr = HeapAddr.fromNum(10);
    const h = HeapInBytes.fromData({
      type: Type.FrameAddr,
      gcFlag: GcFlag.Unmarked,
      data: dataAddr,
      child: nextAddr,
    });
    const bytes = h.toBytes();
    const converted = HeapInBytes.fromBytes(bytes).toData() as any;
    expect(converted.data).toStrictEqual(dataAddr);
    expect(converted.child).toStrictEqual(nextAddr);
  });

  test("should correctly convert value to bytes", () => {
    const nextAddr = HeapAddr.fromNum(9);
    const dataAddr = HeapAddr.fromNum(10);
    const h = HeapInBytes.fromData({
      type: Type.Value,
      gcFlag: GcFlag.Unmarked,
      data: dataAddr,
      child: nextAddr,
    });
    const bytes = h.toBytes();
    const converted = HeapInBytes.fromBytes(bytes).toData() as any;
    expect(converted.data).toStrictEqual(dataAddr);
    expect(converted.child).toStrictEqual(nextAddr);
  });

  test("should correctly convert heapAddr to bytes", () => {
    const nextAddr = HeapAddr.fromNum(9);
    const h = HeapInBytes.fromData({
      type: Type.HeapAddr,
      gcFlag: GcFlag.Unmarked,
      child: nextAddr,
    });
    const bytes = h.toBytes();
    const converted = HeapInBytes.fromBytes(bytes).toData() as any;
    expect(converted.child).toStrictEqual(nextAddr);
    expect(converted.data).toBeUndefined();
  });
});
