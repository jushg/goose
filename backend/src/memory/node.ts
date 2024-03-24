import { InstrAddr } from "../instruction/base";
import {
  HEAP_NODE_BYTE_INDICES,
  HEAP_NODE_BYTE_SIZE,
  MAX_INT,
  MIN_INT,
} from "./";

export class HeapAddr {
  addr: number;

  static NULL = HeapAddr.fromNum(0);

  static fromHexStr(hex: string): HeapAddr {
    const addr = parseInt(hex, 16);
    return HeapAddr.fromNum(addr);
  }

  static fromNum(pointer: number): HeapAddr {
    return new HeapAddr(pointer);
  }

  isNull() {
    return this.addr === HeapAddr.NULL.addr;
  }

  private constructor(address: number) {
    this.addr = address;
  }
}

export enum HeapType {
  Bool = "B",
  Int = "I",
  String = "S",
  List = "L", // Singly Linked List Node. .next (childBytes) is a ptr to next node, .objAddr (dataBytes) is a ptr to value
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
      type: HeapType.List;
      gcFlag: GcFlag;
      next: HeapAddr /** location of next symbol in frame if exists */;
      objAddr: HeapAddr /** location of value for this symbol */;
    };

export type HeapValue<T> = Extract<AnyHeapValue, { type: T }>;

export class HeapInBytes {
  _bytes: number[]; /** Node contents as UINT8 (bytes) */

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
    } else if (
      heapVal.type === HeapType.List ||
      heapVal.type === HeapType.String
    ) {
      child = HeapInBytes.convertPrimitiveDataToBytes(heapVal.next.addr);
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
    } else if (heapVal.type === HeapType.List) {
      data = HeapInBytes.convertPrimitiveDataToBytes(heapVal.objAddr.addr);
    }

    if (heapVal.type === HeapType.String) {
      // For string, padding end with '\0' will do.
      while (data.length < HEAP_NODE_BYTE_SIZE.data) {
        data.push(0 /* char code for '\0' */);
      }
    } else if (
      heapVal.type === HeapType.List ||
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
      case HeapType.List: {
        const objAddr = HeapAddr.fromNum(
          dataBytes.reduce((acc, cur) => acc * 2 ** 8 + cur)
        );
        const next = HeapAddr.fromNum(
          childBytes.reduce((acc, cur) => acc * 2 ** 8 + cur)
        );
        const res: HeapValue<HeapType.List> = { type, gcFlag, objAddr, next };
        return res;
      }

      default:
        throw new Error(`Invalid type for heap node: ${type}`);
    }
  }

  toString(): string {
    const { type, gcFlag } = HeapInBytes.fromTagByte(
      this._bytes[HEAP_NODE_BYTE_INDICES.tag]
    );
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
    return `${type}${gcFlag}: ${childAsHex} ${dataAsHex}`;
  }
}
