import { AnyGoslingObject, Literal } from ".";
import { HeapAddr } from "../memory";

export type GoslingOperandStackObj = {
  push(val: Literal<AnyGoslingObject> | HeapAddr): void;
  pop(): AnyGoslingObject;
  peek(): AnyGoslingObject;
  toString(): string;
  length(): number;
};
