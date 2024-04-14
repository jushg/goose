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

export const useVm = (compiledFile: CompiledFile | null) => {
  const memorySizeInNodes = (2 ** 8) ** 2;
  const { log, appendLog, resetLog } = useVmLogs();
  let vmState: ExecutionState | null = null;

  useEffect(() => {
    if (!compiledFile) return;

    console.info("initializing vm");

    resetLog();
    const initState = initializeVirtualMachine(
      compiledFile,
      memorySizeInNodes,
      appendLog
    );

    vmState = initState;
  }, [compiledFile]);

  const executor = useCallback(async (): Promise<boolean> => {
    if (!vmState) {
      return false;
    }
    console.info(
      `
    [ ] Executing step!!
      time left: ${vmState.machineState.TIME_SLICE}
      thread: ${vmState.jobState.getId()}
      executing step ${JSON.stringify(
        vmState.program.instructions.at(vmState.jobState?.getPC()?.addr)
      )}`
    );
    const newVmState = executeStep(vmState);
    console.info(`
    [x] ~~executed step~~
      time left: ${vmState.machineState.TIME_SLICE}
      thread: ${vmState.jobState.getId()}
      newVm: ${newVmState !== null}
     `);
    vmState = newVmState;
    return true;
  }, [compiledFile]);

  return { log, executeStep: executor };
};
