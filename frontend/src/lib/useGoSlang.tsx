import { CompiledFile } from "go-slang/src/common/compiledFile";
import { ExecutionState } from "go-slang/src/common/state";
import { compileParsedProgram } from "go-slang/src/compiler";
import { ProgramObj, parse } from "go-slang/src/parser";
import {
  executeStep,
  initializeVirtualMachine,
} from "go-slang/src/virtual_machine";
import { useCallback, useEffect, useState } from "react";
import { useVmLogs } from "./useVmLog";

export const useCompiler = () => {
  type CompilationState = "PARSE_FAILED" | "COMPILATION_FAILED" | "COMPILED";
  const [compiledFile, setCompiledFile] = useState<CompiledFile | null>(null);
  const [state, setState] = useState<CompilationState>("PARSE_FAILED");

  const setGooseCode = async (gooseCode: string) => {
    console.info(`setting goose code: \n---\n${gooseCode}\n`);

    let parsedProg: ProgramObj;
    try {
      parsedProg = parse(gooseCode);
    } catch (e) {
      setState("PARSE_FAILED");
      console.error(e);
      return;
    }

    let cf: CompiledFile;
    try {
      cf = compileParsedProgram(parsedProg);
      console.dir(cf);
      setCompiledFile(cf);
    } catch (e) {
      setState("COMPILATION_FAILED");
      console.error(e);
      return;
    }
  };

  return { setGooseCode, state, compiledFile };
};

export type useVmOptions = {
  compiledFile: CompiledFile | null;
  breakpoints?: number[];
  memorySizeInNodes?: number;
  gcTriggerMemoryUsageThreshold?: number;
};

type ExecutionTimePoint = {
  threadId: string;
  instructionIdx: number;
  status: "breakpoint" | "finished" | "error";
};

export const useVm = (args: useVmOptions) => {
  const {
    compiledFile,
    breakpoints,
    memorySizeInNodes,
    gcTriggerMemoryUsageThreshold,
  } = args;
  const { log, appendLog, resetLog } = useVmLogs();
  const [resumeKey, setResumeKey] = useState<string>("");
  const [instructionCount, setInstructionCount] = useState<number>(0);
  let vmState: ExecutionState | null = null;

  useEffect(() => {
    if (!compiledFile) return;

    console.info("initializing vm");

    resetLog();
    const initState = initializeVirtualMachine(
      compiledFile,
      memorySizeInNodes,
      appendLog,
      gcTriggerMemoryUsageThreshold
    );

    vmState = initState;
  }, [args]);

  const executor = useCallback(
    async (clientResumeKey: string): Promise<ExecutionTimePoint | null> => {
      if (!vmState) {
        return null;
      }

      let currentTimePoint: ExecutionTimePoint = {
        threadId: vmState.jobState.getId(),
        instructionIdx: vmState.jobState.getPC().addr,
        status: "breakpoint",
      };

      if (clientResumeKey !== resumeKey) {
        console.info("skipping execution");
        return currentTimePoint;
      }

      while (true) {
        try {
          console.info(
            `[ ] Executing step!!` +
              `\n  time left: ${vmState.machineState.TIME_SLICE}` +
              `\n  thread: ${vmState.jobState.getId()}` +
              `\n  executing step ${JSON.stringify(
                vmState.program.instructions.at(vmState.jobState?.getPC()?.addr)
              )}`
          );

          const newVmState = executeStep(vmState);
          setInstructionCount((c) => c + 1);
          if (newVmState === null) {
            currentTimePoint.status = "finished";
            return currentTimePoint;
          }

          const newInstructionIdx = newVmState.jobState.getPC().addr;
          if (breakpoints && breakpoints.includes(newInstructionIdx)) {
            setResumeKey(`newInstructionIdx_${Math.random()}`);
            currentTimePoint.status = "breakpoint";
            return currentTimePoint;
          }

          console.info(
            `[x] ~~executed step~~` +
              `\n  time left: ${vmState.machineState.TIME_SLICE}` +
              `\n  thread: ${vmState.jobState.getId()}` +
              `\n  newVm: ${newVmState !== null}`
          );
          vmState = newVmState;
        } catch (e) {
          console.error(e);
          currentTimePoint.status = "error";
          return currentTimePoint;
        }
      }
    },
    [args, setInstructionCount, resumeKey, setResumeKey]
  );

  return { log, executeStep: executor, resumeKey, instructionCount };
};
