import { CompiledFile } from "../common/compileFile";
import { compileParsedProgram } from "../compiler";
import { InterruptedError } from "../error";
import { codeFilesRunner } from "./fileRunner";
import parseProgram from "./preprocessFile";
import {
  Context,
  Error as ResultError,
  Finished,
  RecursivePartial,
  Result,
} from "../types";

export interface IOptions {
  scheduler: "preemptive" | "async";
  steps: number;
  stepLimit: number;
  originalMaxExecTime: number;
  useSubst: boolean;
  isPrelude: boolean;
  throwInfiniteLoops: boolean;
  envSteps: number;
  /**
   * Set this to true if source file information should be
   * added when parsing programs into ASTs
   *
   * Set to null to let js-slang decide automatically
   */
  shouldAddFileName: boolean | null;
}

// needed to work on browsers
if (typeof window !== "undefined") {
  // @ts-ignore
  SourceMapConsumer.initialize({
    "lib/mappings.wasm": "https://unpkg.com/source-map@0.7.3/lib/mappings.wasm",
  });
}

// let verboseErrors: boolean = false;

// export function parseError(
//   errors: GoslangError[],
//   verbose: boolean = verboseErrors
// ): string {
//   const errorMessagesArr = errors.map((error) => {
//     // FIXME: Either refactor the parser to output an ESTree-compliant AST, or modify the ESTree types.
//     const filePath = error.location?.source
//       ? `[${error.location.source}] `
//       : "";
//     const line = error.location ? error.location.start.line : "<unknown>";
//     const column = error.location ? error.location.start.column : "<unknown>";
//     const explanation = error.explain();

//     if (verbose) {
//       // TODO currently elaboration is just tagged on to a new line after the error message itself. find a better
//       // way to display it.
//       const elaboration = error.elaborate();
//       return line < 1
//         ? `${filePath}${explanation}\n${elaboration}\n`
//         : `${filePath}Line ${line}, Column ${column}: ${explanation}\n${elaboration}\n`;
//     } else {
//       return line < 1 ? explanation : `${filePath}Line ${line}: ${explanation}`;
//     }
//   });
//   return errorMessagesArr.join("\n");
// }

export async function runInContext(
  code: string,
  context: Context,
  options: RecursivePartial<IOptions> = {}
): Promise<Result> {
  const defaultFilePath = "/main.go";
  const files: Partial<Record<string, string>> = {};
  files[defaultFilePath] = code;
  return runFilesInContext(files, defaultFilePath, context, options);
}

export async function runFilesInContext(
  files: Partial<Record<string, string>>,
  entrypointFilePath: string,
  context: Context,
  options: RecursivePartial<IOptions> = {}
): Promise<Result> {
  return codeFilesRunner(files, entrypointFilePath, context);
}

// DONE
export function resume(
  result: Result
): Finished | ResultError | Promise<Result> {
  if (result.status === "finished" || result.status === "error") {
    return result;
  } else {
    return result.scheduler.run(result.it, result.context);
  }
}

//DONE
export function interrupt(context: Context) {
  const globalEnvironment =
    context.runtime.environments[context.runtime.environments.length - 1];
  context.runtime.environments = [globalEnvironment];
  context.runtime.isRunning = false;
  context.runtime.nodes;
  //   context.errors.push(new InterruptedError(context.runtime.nodes[0]));
  context.errors.push(new InterruptedError());
}

export function compile(
  code: string,
  context: Context
): Promise<CompiledFile | undefined> {
  const defaultFilePath = "/main.go";
  const files: Partial<Record<string, string>> = {};
  files[defaultFilePath] = code;
  return compileFiles(files, defaultFilePath, context);
}

export async function compileFiles(
  files: Partial<Record<string, string>>,
  entrypointFilePath: string,
  context: Context
): Promise<CompiledFile | undefined> {
  const parsedProgram = await parseProgram(files, entrypointFilePath);

  if (!parsedProgram) {
    return undefined;
  }

  try {
    return compileParsedProgram(parsedProgram);
  } catch (error) {
    // context.errors.push(error);
    return undefined;
  }
}

export { Context, Result };
