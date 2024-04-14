import { CompiledFile } from "go-slang/src/common/compiledFile";
import { ExecutionState } from "go-slang/src/common/state";
import { compileParsedProgram } from "go-slang/src/compiler";
import { ProgramObj, parse } from "go-slang/src/parser";
import {
  executeStep,
  initializeVirtualMachine,
} from "go-slang/src/virtual_machine";
import { useCallback, useEffect, useState } from "react";

export const useCompiler = () => {
  type CompilationState = "PARSE_FAILED" | "COMPILATION_FAILED" | "COMPILED";
  const [compiledFile, setCompiledFile] = useState<CompiledFile | null>(null);
  const [state, setState] = useState<CompilationState>("PARSE_FAILED");

  const setGooseCode = (gooseCode: string) => {
    console.info(`setting goose code: \n---\n${gooseCode}\n`);

    let parsedProg: ProgramObj;
    try {
      parsedProg = parse(gooseCode);
      console.dir(parsedProg);
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

export type LogItem = {
  ctx: { threadId: string } | { component: string };
  message: string;
  timestamp: string;
};

export const useVm = (compiledFile: CompiledFile | null) => {
  const [log, setLog] = useState<LogItem[]>([]);
  let vmState: ExecutionState | null = null;

  useEffect(() => {
    console.log("initializing vm");

    if (!compiledFile) return;
    const initState = initializeVirtualMachine(
      compiledFile,
      (2 ** 8) ** 2,
      (ctx, s) => {
        const d = new Date();
        setLog((log) => [
          ...log,
          {
            ctx,
            message: s,
            timestamp: `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`,
          },
        ]);
      }
    );

    setLog([]);
    vmState = initState;
  }, [compiledFile]);

  const executor = useCallback(() => {
    if (!vmState) {
      return false;
    }
    console.log(
      `
    [ ] Executing step!!
      time left: ${vmState.machineState.TIME_SLICE}
      thread: ${vmState.jobState.getId()}
      executing step ${JSON.stringify(
        vmState.program.instructions.at(vmState.jobState?.getPC()?.addr)
      )}`
    );
    const newVmState = executeStep(vmState);
    if (!newVmState) {
      console.log("no new vm state");
      console.dir(vmState.jobState);
      console.log(vmState.machineState.JOB_QUEUE.print());
    }
    console.log(`
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
