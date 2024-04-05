import { CompiledFile } from "../common/compileFile";
import {
  AnyTypeObj,
  BlockObj,
  ExprObj,
  IdentObj,
  StmtObj,
  makeFunctionType,
} from "../parser";

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

export function scanDeclaration(stmts: StmtObj[]): [string, AnyTypeObj][] {
  let decls: [string, AnyTypeObj][] = [];
  stmts.forEach((stmt) => {
    if (stmt.stmtType === "VAR_DECL") {
      assertStmt("VAR_DECL", stmt);
      decls.push([stmt.ident.val, stmt.type]);
    } else if (stmt.stmtType === "CONST_DECL") {
      assertStmt("CONST_DECL", stmt);
      let type: AnyTypeObj = { tag: "TYPE", type: { base: "NIL" } };
      if (stmt.type !== null) {
        type = stmt.type;
      } else {
        // TODO: infer type if no type here
      }
      decls.push([stmt.ident.val, type]);
    } else if (stmt.stmtType === "FUNC_DECL") {
      assertStmt("FUNC_DECL", stmt);
      decls.push([stmt.ident.val, stmt.lit.type]);
    } else if (stmt.stmtType === "ASSIGN") {
      assertStmt("ASSIGN", stmt);
      if (stmt.op === "=") return;

      const lhs = stmt.lhs;
      assertTag("IDENT", lhs);
      decls.push([lhs.val, { tag: "TYPE", type: { base: "NIL" } }]);
    }
  });
  return decls;
}
