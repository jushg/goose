import { Box, Paper, Stack } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import "./App.css";
import { Editor } from "./components/Editor";
import { MemoryVisualiser } from "./components/MemoryVisualiser";
import { VmStatus, VmVisualizer } from "./components/VmVisualizer";
import { useCompiler, useVm, useVmOptions } from "./hooks/useGoSlang";

export const VERBOSITY: 0 | 1 | 2 = 2;

function App() {
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [vmStatus, setVmState] = useState<VmStatus>("NOT_COMPILED");
  const [errorMessageIfAny, setErrorMessageIfAny] = useState<string | null>(
    null
  );
  const { setGooseCode, compiledFile, compilationState } = useCompiler();
  const vmOptions = useMemo<useVmOptions>(
    () => ({ compiledFile, breakpoints }),
    [compiledFile, breakpoints]
  );
  const {
    executeStep,
    log,
    resumeKey,
    instructionCount,
    resetVm,
    exposeState,
  } = useVm(vmOptions);
  const setIsCompiled = useCallback(
    (isCompiled: boolean) =>
      isCompiled ? setVmState("COMPILED") : setVmState("NOT_COMPILED"),
    [setVmState]
  );
  const resumeHandler = useCallback(() => {
    setVmState("RUNNING");
    executeStep(resumeKey).then((t) => {
      if (!t) {
        console.error("executeStep returned null: vm is not initialized");
        return;
      }

      if (t.status === "error") {
        setErrorMessageIfAny(t.errorMessage || "error!");
        return;
      }

      setErrorMessageIfAny(null);
      if (t.status === "finished") {
        setVmState("FINISHED");
      } else if (t.status === "breakpoint") {
        setVmState("PAUSED");
      } else if (t.status === "breakpoint") {
        setVmState("PAUSED");
      } else {
        const _: never = t.status;
      }
    });
  }, [setErrorMessageIfAny, executeStep, resumeKey]);
  console.info("App rendered");

  return (
    <>
      <Stack
        spacing={2}
        width={"100vw"}
        height={"100vh"}
        bgcolor={"slategray"}
        alignItems={"center"}
        paddingTop={"2%"}
      >
        <Box sx={{ width: "95%", height: "60%" }}>
          <Paper elevation={3} style={{ height: "100%" }}>
            <Editor
              isCompiled={vmStatus !== "NOT_COMPILED"}
              setIsCompiled={setIsCompiled}
              compilationState={compilationState}
              setGooseCode={setGooseCode}
              compiledFile={compiledFile}
              setBreakpoints={setBreakpoints}
            />
          </Paper>
        </Box>
        <Box sx={{ width: "95%", height: "30%" }}>
          <Paper elevation={3} style={{ height: "100%" }}>
            <VmVisualizer
              vmStatus={vmStatus}
              logs={log}
              errorMessageIfAny={errorMessageIfAny}
              instructionCount={instructionCount}
              resumeHandler={resumeHandler}
              resetVm={resetVm}
            />
          </Paper>
        </Box>
      </Stack>
      <Stack
        spacing={2}
        width={"100vw"}
        height={"100vh"}
        bgcolor={"skyblue"}
        alignItems={"center"}
        paddingTop={"2%"}
      >
        <Box sx={{ width: "95%", height: "90%" }}>
          <Paper elevation={3} style={{ height: "100%" }}>
            <MemoryVisualiser exposeState={exposeState} />
          </Paper>
        </Box>
      </Stack>
    </>
  );
}

export default App;
