import { InstrAddr } from "../instruction/base";
import { HeapAddr, HeapType } from "../memory";

export type AnyGoslingObject =
  | GoslingBinaryPtrObj
  | GoslingBoolObj
  | GoslingIntObj
  | GoslingStringObj;

export type Literal<T extends AnyGoslingObject> = T extends T
  ? Omit<T, "addr">
  : never;

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

export type GoslingOperandStackObj = {
  push(val: Literal<AnyGoslingObject>): void;
  pop(): Literal<AnyGoslingObject>;
  peek(): Literal<AnyGoslingObject>;
  getTopAddr(): HeapAddr;
};

export type GoslingScopeObj = {
  lookup(symbol: string): AnyGoslingObject | null;
  assign(symbol: string, val: Literal<AnyGoslingObject>): void;
  getEnclosingScopeAddr(): GoslingScopeObj;
  allocNewFrame(symbols: string[]): GoslingScopeObj;
  getTopScopeAddr(): HeapAddr;
};

export type GoslingLambdaObj = {
  closure: GoslingScopeObj;
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
  set(addr: HeapAddr, val: Literal<AnyGoslingObject>): void;
  clear(addr: HeapAddr): void;
  alloc(data: Literal<AnyGoslingObject>): AnyGoslingObject;

  getLambda(addr: HeapAddr): GoslingLambdaObj;
  allocLambda(closureAddr: HeapAddr, pcAddr: InstrAddr): HeapAddr;
  getEnvs(addr: HeapAddr): GoslingScopeObj;
};
