import { ParsedProgram } from "./types";
import { parse } from "./parser";

const parseProgram = async (
  files: Partial<Record<string, string>>,
  entrypointFilePath: string
): Promise<ParsedProgram | undefined> => {
  // Parse all files into ASTs and build the import graph.
  if (!files[entrypointFilePath]) {
    return undefined;
  }
  let parsedProgram: ParsedProgram = {
    topLvlDecls: parse(files[entrypointFilePath]),
  };

  return parsedProgram;
};

export default parseProgram;
