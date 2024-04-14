import { parse as pegParse } from "./peg";
import { ProgramObj } from "./peggyHelpers";
export * from "./peggyHelpers";
export { parse };

const parse = pegParse as (input: string) => ProgramObj;
