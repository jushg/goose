import { CompiledFile } from "../common/compileFile";
import { BlockObj, ExprObj, IdentObj, StmtObj } from "../parser";

export function addLabelIfExist(
  pc: number,
  label: IdentObj | undefined,
  pf: CompiledFile
) {
  if (label !== undefined) {
    pf.labelMap[label.val] = pc;
  }
}

export type AnyTagObj = StmtObj | ExprObj | BlockObj;

export function isTag<T extends AnyTagObj["tag"]>(
  expectedTag: T,
  val: AnyTagObj
): val is Extract<AnyTagObj, { tag: T }> {
  return val.tag === expectedTag;
}

export function assertTag<T extends AnyTagObj["tag"]>(
  expectedTag: T,
  val: AnyTagObj
): asserts val is Extract<AnyTagObj, { tag: T }> {
  if (!isTag(expectedTag, val)) {
    throw new Error(`Expected tag ${expectedTag} on ${val}`);
  }
}

export function isStmt<T extends StmtObj["stmtType"]>(
  expectedStmtType: T,
  val: AnyTagObj
): val is Extract<StmtObj, { stmtType: T }> {
  return isTag("STMT", val) && val.stmtType === expectedStmtType;
}

export function assertStmt<T extends StmtObj["stmtType"]>(
  expectedStmtType: T,
  val: AnyTagObj
): asserts val is Extract<StmtObj, { stmtType: T }> {
  if (!isTag("STMT", val) || !isStmt(expectedStmtType, val)) {
    throw new Error(`Expected stmt type ${expectedStmtType}, on ${val}`);
  }
}
