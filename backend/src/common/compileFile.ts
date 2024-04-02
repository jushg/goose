import { AnyInstructionObj } from "./instructionObj";

export type CompileFile = {
  instructions: Array<AnyInstructionObj>;
  labelMap: { [key: string]: number };
  gotoLabelMap: { [key: string]: number };
  topLevelDecl: Array<number>;
};
