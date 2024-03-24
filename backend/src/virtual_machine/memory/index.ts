import { InstrAddr } from "../../instruction/base";
import { HeapAddr } from "../../memory";

export enum GoslingType {
  Bool = "B",
  Int = "I",
  String = "S",
  Lambda = "L",
  Frame = "F",
  Ptr = "P",
  Symbol = "K",
  Value = "V",
  KeyValueList = "X",
  List = "Y",
}

export type GoslingObject<T extends GoslingType> = Extract<
  AnyGoslingObject,
  { type: T }
>;

export type AnyGoslingObject =
  | {
      addr: HeapAddr;
      type: GoslingType.Bool;
      data: boolean;
    }
  | {
      addr: HeapAddr;
      type: GoslingType.Int;
      data: number;
    }
  | {
      addr: HeapAddr;
      type: GoslingType.String;
      data: string;
    }
  | {
      addr: HeapAddr;
      type: GoslingType.Lambda;
      pcAddr: InstrAddr;
      closure: GoslingObject<GoslingType.Frame> | null;
    }
  | {
      addr: HeapAddr;
      type: GoslingType.Frame;

      env: GoslingKeyValueList | null;
      parentEnv: GoslingObject<GoslingType.Frame> | null;
    }
  | {
      addr: HeapAddr;
      type: GoslingType.Value;

      obj: AnyGoslingObject | null;
      next: GoslingObject<GoslingType.Value> | null;
    }
  | {
      addr: HeapAddr;
      type: GoslingType.Ptr;

      obj: AnyGoslingObject | null;
    };

export type GoslingList = {
  addr: HeapAddr;
  type: GoslingType.List;

  arr: GoslingObject<GoslingType.Value>[];
};

export type GoslingKeyValueList = {
  addr: HeapAddr;
  type: GoslingType.KeyValueList;

  arr: {
    k: string;
    v: AnyGoslingObject | null;
    addrs: { k: HeapAddr; v: HeapAddr };
  }[];
};

export function isGoslingType<T extends GoslingType>(
  val: T,
  obj: AnyGoslingObject
): obj is GoslingObject<T> {
  return obj.type === val;
}
export function assertGoslingType<T extends GoslingType>(
  val: T,
  obj: AnyGoslingObject
): asserts obj is GoslingObject<T> {
  if (!isGoslingType(val, obj)) {
    throw new Error(`Expected GoslingObj type ${val}, got ${obj.type}`);
  }
}

export type IGoslingMemoryManager = {
  get(addr: HeapAddr): AnyGoslingObject | null;
  set(addr: HeapAddr, val: Omit<AnyGoslingObject, "addr">): void;
  clear(addr: HeapAddr): void;
  alloc(data: Omit<AnyGoslingObject, "addr">): AnyGoslingObject;
};
