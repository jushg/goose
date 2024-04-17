import { Box, Paper, Stack, Typography } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import "./App.css";
import { Editor } from "./components/Editor";
import { MemoryVisualiser } from "./components/MemoryVisualiser";
import { VmStatus, VmVisualizer } from "./components/VmVisualizer";
import { useCompiler, useVm, useVmOptions } from "./hooks/useGoSlang";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { InstrVisualiser } from "./components/InstrVisualiser";
import 'react-tabs/style/react-tabs.css';

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
    <div className="App" style={{ height: '92vh', color: '#ffffff' }}>
            <header className="App-header">
                <h3 style={{ marginLeft: '10px' }}>
                    Goose - Go Interpreter with Virtual Machine (VM)
                </h3>
            </header>
    <Stack direction="row" spacing={2} maxHeight={'90vh'}>
    <Box width={"70%"} height={"100%"}>
        <Paper elevation={3} style={{ height: "100%" }}>
          <Editor
            vmStatus={vmStatus}
            setIsCompiled={setIsCompiled}
            setGooseCode={setGooseCode}
            setBreakpoints={setBreakpoints}
            resetVm={resetVm}
            resumeHandler={resumeHandler}
          />
        </Paper>
      </Box>

      <Box width={"50%"} height={"100%"}>
      <Tabs>
        <TabList>
            <Tab>Instructions</Tab>
            <Tab> Output Log</Tab>
            <Tab> Visualization</Tab>
        </TabList>
        <TabPanel>
            <Paper elevation={3}>
              <Typography variant="h6">Instructions</Typography>
                {vmStatus === "NOT_COMPILED"? (
                  <Typography>Compile to see instructions</Typography>
                ) : compilationState === "PARSE_FAILED" ? (
                  <Typography>Parse failed</Typography>
                ) : compilationState === "COMPILATION_FAILED" ? (
                  <Typography>Compilation failed</Typography>
                ) : (
                  <InstrVisualiser
                    compiledFile={compiledFile!}
                    setBreakpoints={setBreakpoints}
                  />
                )}
            </Paper>
        </TabPanel>

        <TabPanel>
            <Paper elevation={3}>
              <Typography variant="h6">Output Log</Typography>
                {vmStatus === "NOT_COMPILED" ? (
                  <Typography>Compile program first</Typography>
                ) : (<VmVisualizer
                    errorMessageIfAny={errorMessageIfAny}
                    vmStatus={vmStatus}
                    logs={log}
                    instructionCount={instructionCount}
                  />)
                }                
          </Paper>
        </TabPanel>
      </Tabs>
      </Box>
      </Stack>
    </div>
  );
}

export default App;
