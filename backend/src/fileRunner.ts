import { IOptions } from ".";
import { compileParsedProgram } from "./compiler";
import { UNKNOWN_LOCATION } from "./constants";
import parseProgram from "./preprocessFile";
import { Context, ParsedProgram, RecursivePartial, Result } from "./types";
import { runProgram } from "./virtual_machine";

const DEFAULT_SOURCE_OPTIONS: Readonly<IOptions> = {
  scheduler: "async",
  steps: 1000,
  stepLimit: -1,
  originalMaxExecTime: 1000,
  useSubst: false,
  isPrelude: false,
  throwInfiniteLoops: true,
  envSteps: -1,
  shouldAddFileName: null,
};

let previousCode: {
  files: Partial<Record<string, string>>;
  entrypointFilePath: string;
} | null = null;
let isPreviousCodeTimeoutError = false;

export async function codeRunner(
  parsedProgram: ParsedProgram,
  context: Context
): Promise<Result> {
  try {
    return Promise.resolve({
      status: "finished",
      context,
      value: runProgram(compileParsedProgram(parsedProgram.topLvlDecls)),
    });
  } catch (error) {
    // if (
    //   error instanceof RuntimeSourceError ||
    //   error instanceof ExceptionError
    // ) {
    //   context.errors.push(error); // use ExceptionErrors for non Source Errors
    //   return resolvedErrorPromise;
    // }
    // context.errors.push(new ExceptionError(error, UNKNOWN_LOCATION));
    return resolvedErrorPromise;
  }
}

export async function codeFilesRunner(
  files: Partial<Record<string, string>>,
  entrypointFilePath: string,
  context: Context,
  options: RecursivePartial<IOptions> = {}
): Promise<Result> {
  const preprocessedProgram = await parseProgram(files, entrypointFilePath);
  if (!preprocessedProgram) {
    return resolvedErrorPromise;
  }

  return codeRunner(preprocessedProgram, context);
}

export const resolvedErrorPromise = Promise.resolve({
  status: "error",
} as Result);
