import { CompiledFile } from "go-slang/src/common/compiledFile";
import { ExecutionState } from "go-slang/src/common/state";
import { compileParsedProgram } from "go-slang/src/compiler";
import { ProgramObj, parse } from "go-slang/src/parser";
import {
  executeStep,
  initializeVirtualMachine,
} from "go-slang/src/virtual_machine";
import { useCallback, useEffect, useState } from "react";
import { VERBOSITY } from "../App";
import { useVmLogs } from "./useVmLog";

export type CompilationState =
  | "PARSE_FAILED"
  | "COMPILATION_FAILED"
  | "COMPILED";

export const useCompiler = () => {
  const [compiledFile, setCompiledFile] = useState<CompiledFile | null>(null);
  const [state, setState] = useState<CompilationState>("PARSE_FAILED");

  const setGooseCode = async (gooseCode: string) => {
    VERBOSITY > 1 && console.info(`setting goose code: \n---\n${gooseCode}\n`);

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
      VERBOSITY > 1 && console.dir(cf);
      setCompiledFile(cf);
    } catch (e) {
      setState("COMPILATION_FAILED");
      console.error(e);
      return;
    }

    setState("COMPILED");
  };

  return { setGooseCode, compilationState: state, compiledFile };
};

export type useVmOptions = {
  compiledFile: CompiledFile | null;
  breakpoints: number[];
  memorySizeInNodes?: number;
  gcTriggerMemoryUsageThreshold?: number;
};

export type ExecutionTimePoint = {
  threadId: string;
  instructionIdx: number;
  status: "breakpoint" | "finished" | "error";
  errorMessage?: string;
};

const executeTillBreakHelper = (
  vmState: ExecutionState | null,
  timepoint: ExecutionTimePoint,
  breakpoints: number[],
  incrementInstructionCount: () => void,
  setResumeKey: (s: string) => void
): [ExecutionTimePoint, ExecutionState | null] => {
  while (true) {
    try {
      if (vmState === null) {
        console.info("vmState is null, returning");
        return [timepoint, vmState];
      }

      VERBOSITY > 1 &&
        console.info(
          `[ ] Executing step!!` +
            `\n  thread: ${vmState.jobState.getId()}` +
            ` timeslice: ${vmState.machineState.TIME_SLICE}` +
            `\n  executing step ${JSON.stringify(
              vmState.program.instructions.at(vmState.jobState.getPC().addr)
            )}`
        );

      vmState = executeStep(vmState);
      incrementInstructionCount();
      if (vmState === null) {
        timepoint.status = "finished";
        return [timepoint, vmState];
      }

      const instructionIdx = vmState.jobState.getPC().addr;
      timepoint = {
        status: "breakpoint",
        threadId: vmState.jobState.getId(),
        instructionIdx,
      };

      const hasTriggeredSysCallBreakPoint =
        vmState.jobState.getStatus() === "BREAKPOINT";
      if (hasTriggeredSysCallBreakPoint) {
        vmState.jobState.setStatus("RUNNABLE");
        vmState.machineState.TIME_SLICE += 20;
      }

      if (
        breakpoints.includes(instructionIdx) ||
        hasTriggeredSysCallBreakPoint
      ) {
        const newResumeKey = `${instructionIdx}_${Math.random()}`;
        VERBOSITY > 0 &&
          console.info(
            `[!] breakpoint hit: ${instructionIdx} in thread ${vmState.jobState.getId()}\n` +
              ` isSysCall:${hasTriggeredSysCallBreakPoint} ` +
              `bt: [${breakpoints.join(", ")}], ` +
              `setting resume key to ${newResumeKey}`
          );
        setResumeKey(`${instructionIdx}_${Math.random()}`);
        timepoint.status = "breakpoint";
        return [timepoint, vmState];
      }

      VERBOSITY > 1 && console.info("[x] ~~executed step~~");
    } catch (e) {
      console.error(e);

      const instructionIdx = vmState && vmState.jobState.getPC().addr;
      timepoint.status = "error";
      timepoint.errorMessage = vmState
        ? "--- error in execution: ---" +
          `\n  thread: ${vmState.jobState.getId()}` +
          `\n  last executed instr[${instructionIdx!}] ${JSON.stringify(
            vmState.program.instructions.at(instructionIdx!)
          )}` +
          `\n  error: ${JSON.stringify(e)}`
        : "--- error in execution: ---\n  but vmState is null";

      console.error(timepoint.errorMessage);
      return [timepoint, vmState];
    }
  }
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
  const [vmState, setVmState] = useState<ExecutionState | null>(null);

  const resetVm = useCallback(() => {
    if (!compiledFile) return;

    console.info("initializing vm");

    resetLog();
    const initState = initializeVirtualMachine(
      compiledFile,
      memorySizeInNodes,
      appendLog,
      gcTriggerMemoryUsageThreshold
    );

    setVmState(initState);
    setInstructionCount(0);
  }, [
    memorySizeInNodes,
    compiledFile,
    gcTriggerMemoryUsageThreshold,
    resetLog,
    appendLog,
    setInstructionCount,
  ]);

  useEffect(resetVm, [
    memorySizeInNodes,
    compiledFile,
    gcTriggerMemoryUsageThreshold,
    resetVm,
    resetLog,
    appendLog,
    setInstructionCount,
  ]);

  const executeTillBreak = useCallback(
    (vmState: ExecutionState, timepoint: ExecutionTimePoint) => {
      return executeTillBreakHelper(
        vmState,
        timepoint,
        breakpoints,
        () => setInstructionCount((c) => c + 1),
        setResumeKey
      );
    },
    [breakpoints, setInstructionCount, setResumeKey]
  );

  const executor = useCallback(
    async (clientResumeKey: string): Promise<ExecutionTimePoint | null> => {
      if (!vmState) {
        console.info("vm not initialized");
        return null;
      }

      let currentTimePoint: ExecutionTimePoint = {
        threadId: vmState.jobState.getId(),
        instructionIdx: vmState.jobState.getPC().addr,
        status: "breakpoint",
      };

      if (clientResumeKey !== resumeKey) {
        console.info(
          `skipping execution: '${clientResumeKey}' !== '${resumeKey}'`
        );
        return currentTimePoint;
      }

      console.info(`resuming execution: '${clientResumeKey}'`);
      const [timepoint, newVmState] = executeTillBreak(
        vmState,
        currentTimePoint
      );
      setVmState(newVmState);
      return timepoint;
    },
    [resumeKey, vmState, executeTillBreak]
  );

  return { log, executeStep: executor, resumeKey, instructionCount, resetVm };
};
