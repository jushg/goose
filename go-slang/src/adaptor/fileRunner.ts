import { compileParsedProgram } from "../compiler";
import parseProgram from "./preprocessFile";
import { Context, Result } from "../types";
import { runProgram } from "../virtual_machine";
import { ProgramObj } from "../parser";

export async function codeRunner(
  parsedProgram: ProgramObj,
  context: Context
): Promise<Result> {
  try {
    return Promise.resolve({
      status: "finished",
      context,
      value: runProgram(compileParsedProgram(parsedProgram)),
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
  context: Context
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
