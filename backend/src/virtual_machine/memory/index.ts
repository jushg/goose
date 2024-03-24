import { InstrAddr } from "../../instruction/base";
import { HeapAddr, HeapType } from "../../memory";

export type AnyGoslingObject =
  | GoslingBinaryPtrObj
  | GoslingBoolObj
  | GoslingIntObj
  | GoslingStringObj;

export type GoslingObject<T extends HeapType> = Extract<
  AnyGoslingObject,
  { type: T }
>;

export type GoslingBoolObj = {
  addr: HeapAddr;
  type: HeapType.Bool;
  data: boolean;
};
export type GoslingIntObj = {
  addr: HeapAddr;
  type: HeapType.Int;
  data: number;
};
export type GoslingStringObj = {
  addr: HeapAddr;
  type: HeapType.String;
  data: string;
};
export type GoslingBinaryPtrObj = {
  addr: HeapAddr;
  type: HeapType.BinaryPtr;
  child1: HeapAddr;
  child2: HeapAddr;
};

export type GoslingEnvsObj = {
  ptr: HeapAddr;
  env: {
    values: Record<string, AnyGoslingObject>;
    symbolAddresses: Record<string, HeapAddr>;
  };
}[];

export type GoslingLambdaObj = {
  closure: GoslingEnvsObj;
  pcAddr: InstrAddr;
};

export function isGoslingType<T extends HeapType>(
  val: T,
  obj: AnyGoslingObject
): obj is GoslingObject<T> {
  return obj.type === val;
}
export function assertGoslingType<T extends HeapType>(
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

  getList(addr: HeapAddr): { ptr: HeapAddr; val: AnyGoslingObject }[];
  getLambda(addr: HeapAddr): GoslingLambdaObj;
  getEnvs(addr: HeapAddr): GoslingEnvsObj;
};
