import { ProgramObj, parse } from "../parser";

const parseProgram = async (
  files: Partial<Record<string, string>>,
  entrypointFilePath: string
): Promise<ProgramObj | undefined> => {
  // Parse all files into ASTs and build the import graph.
  if (!files[entrypointFilePath]) {
    return undefined;
  }

  return parse(files[entrypointFilePath]);
};

export default parseProgram;
