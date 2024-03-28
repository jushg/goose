import { Instruction } from "../instruction";

export type ProgramFile = {
    instructions: Array<Instruction>;
    labelMap: { [key: string]: number } 
  };