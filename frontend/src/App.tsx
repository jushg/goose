import { Box, Paper, Stack } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import "./App.css";
import { Editor } from "./components/Editor";
import { VmVisualizer } from "./components/VmVisualizer";
import { useCompiler, useVm, useVmOptions } from "./hooks/useGoSlang";

function App() {
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompiled, setIsCompiled] = useState(false);
  const { setGooseCode, compiledFile, compilationState } = useCompiler();
  const vmOptions = useMemo<useVmOptions>(
    () => ({ compiledFile, breakpoints }),
    [compiledFile, breakpoints]
  );
  const { executeStep, log, resumeKey, instructionCount } = useVm(vmOptions);

  const resumeHandler = useCallback(() => {
    setIsRunning(true);
    executeStep(resumeKey).then(() => setIsRunning(false));
  }, [setIsRunning, executeStep, resumeKey]);

  return (
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
            isCompiled={isCompiled}
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
            isCompiled={isCompiled}
            isRunning={isRunning}
            logs={log}
            instructionCount={instructionCount}
            resumeHandler={resumeHandler}
          />
        </Paper>
      </Box>
    </Stack>
  );
}

export default App;
