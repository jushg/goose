import { InstrAddr } from "../instruction/base";
import { HeapAddr, HeapType } from "../memory";
import { GoslingScopeObj } from "./scope";

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

export type GoslingLambdaObj = {
  closure: GoslingScopeObj;
  pcAddr: InstrAddr;
};

export type GoslingListObj = {
  nodeAddr: HeapAddr;
  node: AnyGoslingObject;
  value: AnyGoslingObject | null;
}[];

export type IGoslingMemoryManager = {
  get(addr: HeapAddr): AnyGoslingObject | null;
  set(addr: HeapAddr, val: Literal<AnyGoslingObject>): void;
  clear(addr: HeapAddr): void;
  alloc(data: Literal<AnyGoslingObject>): AnyGoslingObject;

  getLambda(addr: HeapAddr): GoslingLambdaObj;
  allocLambda(closureAddr: HeapAddr, pcAddr: InstrAddr): HeapAddr;
  getEnvs(addr: HeapAddr): GoslingScopeObj;
};
