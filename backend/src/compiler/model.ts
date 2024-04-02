import { AnyInstructionObj } from "../common/instructionObj";

export type ProgramFile = {
  instructions: Array<AnyInstructionObj>;
  labelMap: { [key: string]: number };
  gotoLabelMap: { [key: string]: number };
  topLevelDecl: Array<number>;
};
