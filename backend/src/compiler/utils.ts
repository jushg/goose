import { BlockObj, IdentObj } from "../parser";
import { CompileFile } from "../common/compileFile";

export function addLabelIfExist(
  pc: number,
  label: IdentObj | undefined,
  pf: CompileFile
) {
  if (label !== undefined) {
    pf.labelMap[label.val] = pc;
  }
}

export type AnyStmtObj = { tag: string; stmtType: string };

export type AnyTagObj = { tag: string };

export function isStmtObj(val: AnyTagObj): val is AnyStmtObj {
  return val.tag === "STMT";
}

export function isBlockObj(val: AnyTagObj): val is BlockObj {
  return val.tag === "BLOCK";
}

export function assertTagObj<T extends AnyTagObj>(
  val: AnyTagObj
): asserts val is T {
  let obj = val as T;
}
