import { AnyInstructionObj } from "./instructionObj";

export type CompiledFile = {
  instructions: Array<AnyInstructionObj>;
  labelMap: { [key: string]: number };
  gotoLabelMap: { [key: string]: number };
};
