import { Box, Paper, Stack } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import "./App.css";
import { Editor } from "./components/Editor";
import { VmVisualizer } from "./components/VmVisualizer";
import { useCompiler, useVm, useVmOptions } from "./hooks/useGoSlang";

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const { setGooseCode, compiledFile, compilationState } = useCompiler();
  const vmOptions = useMemo<useVmOptions>(
    () => ({ compiledFile, breakpoints: [] }),
    [compiledFile]
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
            compilationState={compilationState}
            setGooseCode={setGooseCode}
            compiledFile={compiledFile}
          />
        </Paper>
      </Box>
      <Box sx={{ width: "95%", height: "30%" }}>
        <Paper elevation={3} style={{ height: "100%" }}>
          <VmVisualizer
            logs={log}
            allowResume={!isRunning}
            instructionCount={instructionCount}
            resumeHandler={resumeHandler}
          />
        </Paper>
      </Box>
    </Stack>
  );
}

export default App;
