import {
  HEAP_NODE_BYTE_INDICES,
  HEAP_NODE_BYTE_SIZE,
  HEAP_NODE_BYTE_TOTAL_SIZE,
  MAX_INT,
  MIN_INT,
} from ".";

export class HeapAddr {
  _a: string;

  static getNull = () => HeapAddr.fromNum(0);

  static fromHexStr(hex: string): HeapAddr {
    const addr = parseInt(hex, 16);
    return HeapAddr.fromNum(addr);
  }

  static fromNum(pointer: number): HeapAddr {
    return new HeapAddr(pointer);
  }

  toNum(): number {
    return parseInt(this._a, 16);
  }

  isNull() {
    return this.toNum() === HeapAddr.getNull().toNum();
  }

  private constructor(address: number) {
    this._a = `0x${address.toString(16)}`;
  }

  next(): HeapAddr {
    return HeapAddr.fromNum(this.toNum() + 1);
  }

  toString(): string {
    return `H: 0x${this.toNum().toString(16)}`;
  }

  equals(other: HeapAddr): boolean {
    return this._a === other._a;
  }
}

export enum HeapType {
  Bool = "B",
  Int = "I",
  String = "S",
  BinaryPtr = "P", // Ptr with child1 (childBytes) and child2 (dataBytes)
}

export enum GcFlag {
  Marked = "*",
  Unmarked = " ",
}

export type AnyHeapValue =
  | {
      type: HeapType.Bool;
      gcFlag: GcFlag;
      data: boolean;
    }
  | {
      type: HeapType.Int;
      gcFlag: GcFlag;
      data: number;
    }
  | {
      type: HeapType.String;
      gcFlag: GcFlag;
      next: HeapAddr;
      data: string;
    }
  | {
      type: HeapType.BinaryPtr;
      gcFlag: GcFlag;
      child1: HeapAddr;
      child2: HeapAddr;
    };

export type HeapValue<T> = Extract<AnyHeapValue, { type: T }>;
export function isHeapType<T extends HeapType>(
  type: T,
  val: AnyHeapValue
): val is HeapValue<T> {
  return val.type === type;
}
export function assertHeapType<T extends HeapType>(
  type: T,
  val: AnyHeapValue
): asserts val is HeapValue<T> {
  if (!isHeapType(type, val)) {
    throw new Error(`Invalid heap type ${val.type} instead of ${type}`);
  }
}

export class HeapInBytes {
  _bytes: number[]; /** Node contents as UINT8 (bytes) */

  static getNull = () =>
    HeapInBytes.fromBytes(new Array(HEAP_NODE_BYTE_TOTAL_SIZE).fill(0));

  private constructor(tag: number, child: number[], data: number[]) {
    if (child.length !== HEAP_NODE_BYTE_SIZE.child) {
      throw new Error(`Invalid child byte size: ${child.length}`);
    }
    if (data.length !== HEAP_NODE_BYTE_SIZE.data) {
      throw new Error(`Invalid data byte size: ${data.length}`);
    }

    this._bytes = [tag, ...child, ...data];
  }

  static fromBytes(bytes: number[]): HeapInBytes {
    if (
      bytes.length !==
      HEAP_NODE_BYTE_SIZE.child +
        HEAP_NODE_BYTE_SIZE.data +
        HEAP_NODE_BYTE_SIZE.tag
    ) {
      throw new Error(`Invalid byte size: ${bytes.length}`);
    }

    const tag = bytes[HEAP_NODE_BYTE_INDICES.tag];
    const child = bytes.slice(
      HEAP_NODE_BYTE_INDICES.child,
      HEAP_NODE_BYTE_INDICES.child + HEAP_NODE_BYTE_SIZE.child
    );
    const data = bytes.slice(
      HEAP_NODE_BYTE_INDICES.data,
      HEAP_NODE_BYTE_INDICES.data + HEAP_NODE_BYTE_SIZE.data
    );

    return new HeapInBytes(tag, child, data);
  }

  static fromData(heapVal: AnyHeapValue): HeapInBytes {
    const tag = this.toTagByte(heapVal.type, heapVal.gcFlag);

    let child: number[] = [];
    if (heapVal.type === HeapType.Bool || heapVal.type === HeapType.Int) {
      // For primitive types, child is empty.
    } else if (heapVal.type === HeapType.BinaryPtr) {
      child = HeapInBytes.convertPrimitiveDataToBytes(heapVal.child1.toNum());
    } else if (heapVal.type === HeapType.String) {
      child = HeapInBytes.convertPrimitiveDataToBytes(heapVal.next.toNum());
    } else {
      const _: never = heapVal;
    }

    while (child.length < HEAP_NODE_BYTE_SIZE.child) {
      child.unshift(0);
    }

    let data: number[] = [];
    if (
      heapVal.type === HeapType.Bool ||
      heapVal.type === HeapType.Int ||
      heapVal.type === HeapType.String
    ) {
      data = HeapInBytes.convertPrimitiveDataToBytes(heapVal.data);
    } else if (heapVal.type === HeapType.BinaryPtr) {
      data = HeapInBytes.convertPrimitiveDataToBytes(heapVal.child2.toNum());
    }

    if (heapVal.type === HeapType.String) {
      // For string, padding end with '\0' will do.
      while (data.length < HEAP_NODE_BYTE_SIZE.data) {
        data.push(0 /* char code for '\0' */);
      }
    } else if (
      heapVal.type === HeapType.BinaryPtr ||
      heapVal.type === HeapType.Int ||
      heapVal.type === HeapType.Bool
    ) {
      while (data.length < HEAP_NODE_BYTE_SIZE.data) {
        // For other types, padding start with 0 will do.
        data.unshift(0);
      }
    } else {
      const _: never = heapVal;
    }

    return new HeapInBytes(tag, child, data);
  }

  toHeapValue(): AnyHeapValue {
    const tag = this._bytes[HEAP_NODE_BYTE_INDICES.tag];
    const child = this._bytes.slice(
      HEAP_NODE_BYTE_INDICES.child,
      HEAP_NODE_BYTE_INDICES.child + HEAP_NODE_BYTE_SIZE.child
    );
    const data = this._bytes.slice(
      HEAP_NODE_BYTE_INDICES.data,
      HEAP_NODE_BYTE_INDICES.data + HEAP_NODE_BYTE_SIZE.data
    );

    return HeapInBytes.fromBytesToData(tag, child, data);
  }

  toBytes(): number[] {
    return [...this._bytes];
  }

  static convertPrimitiveDataToBytes(
    data: boolean | number | string
  ): number[] {
    if (typeof data === "boolean") {
      return [data ? 1 : 0];
    } else if (typeof data === "number") {
      if (data > MAX_INT || data < MIN_INT) {
        throw new Error(`Number out of range for heap node: ${data}`);
      }

      const arr = [];

      // Use 2's complement for negative numbers.
      let d: number = data < 0 ? MAX_INT - data : data;
      while (d > 0) {
        arr.unshift(d % 2 ** 8); // Order of bytes: MSB ... LSB
        d = Math.floor(d / 2 ** 8);
      }

      return arr;
    } else if (typeof data === "string") {
      const arr = [];
      for (let i = 0; i < data.length; i++) {
        arr.push(data.charCodeAt(i));
      }

      if (arr.map((x) => x > 255).reduce((a, b) => a || b, false)) {
        throw new Error("String cannot be represented in bytes for heap node");
      }

      return arr;
    } else {
      throw new Error(`Invalid data type for heap node: ${data}`);
    }
  }

  static toTagByte(type: HeapType, gcFlag: GcFlag): number {
    const t: string = type;
    return (gcFlag === GcFlag.Marked ? t.toLowerCase() : t).charCodeAt(0);
  }

  static fromTagByte(tag: number): { type: HeapType; gcFlag: GcFlag } {
    const t: string = String.fromCharCode(tag);
    return {
      type: t.toUpperCase() as HeapType,
      gcFlag: t === t.toLowerCase() ? GcFlag.Marked : GcFlag.Unmarked,
    };
  }

  static fromBytesToData(
    tag: number,
    childBytes: number[],
    dataBytes: number[]
  ) {
    const { type, gcFlag } = this.fromTagByte(tag);
    switch (type) {
      case HeapType.Bool: {
        const data = dataBytes[dataBytes.length - 1] === 1;
        const res: HeapValue<HeapType.Bool> = { type, gcFlag, data };
        return res;
      }
      case HeapType.Int: {
        let data = dataBytes.reduce((acc, cur) => acc * 2 ** 8 + cur, 0);

        // Account for use of 2's complement for negative numbers.
        data = data > MAX_INT ? -(data - MAX_INT) : data;
        const res: HeapValue<HeapType.Int> = { type, gcFlag, data };
        return res;
      }
      case HeapType.String: {
        const data = String.fromCharCode(...dataBytes);
        const next = HeapAddr.fromNum(
          childBytes.reduce((acc, cur) => acc * 2 ** 8 + cur)
        );
        const res: HeapValue<HeapType.String> = { type, gcFlag, next, data };
        return res;
      }
      case HeapType.BinaryPtr: {
        const child1 = HeapAddr.fromNum(
          childBytes.reduce((acc, cur) => acc * 2 ** 8 + cur)
        );
        const child2 = HeapAddr.fromNum(
          dataBytes.reduce((acc, cur) => acc * 2 ** 8 + cur)
        );
        const res: HeapValue<HeapType.BinaryPtr> = {
          type,
          gcFlag,
          child1,
          child2,
        };
        return res;
      }

      default:
        throw new Error(
          `Invalid type for heap node: ${type}: [${tag} ${childBytes} ${dataBytes}]`
        );
    }
  }

  toString(): string {
    const { type, gcFlag } = HeapInBytes.fromTagByte(
      this._bytes[HEAP_NODE_BYTE_INDICES.tag]
    );
    const tagStr =
      this._bytes[HEAP_NODE_BYTE_INDICES.tag] === 0 ? "__" : `${type}${gcFlag}`;

    const child = this._bytes.slice(
      HEAP_NODE_BYTE_INDICES.child,
      HEAP_NODE_BYTE_INDICES.child + HEAP_NODE_BYTE_SIZE.child
    );
    const childAsHex = child
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const data = this._bytes.slice(
      HEAP_NODE_BYTE_INDICES.data,
      HEAP_NODE_BYTE_INDICES.data + HEAP_NODE_BYTE_SIZE.data
    );
    const dataAsHex = data.map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${tagStr}: ${childAsHex} ${dataAsHex}`;
  }
}
