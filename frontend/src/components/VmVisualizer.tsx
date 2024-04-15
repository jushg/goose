import { Box, Button, Stack, Typography } from "@mui/material";
import { LogItem } from "../hooks/useVmLog";
import { LogVisualizer } from "./LogVisualizer";

export const VmVisualizer = ({
  isCompiled,
  isRunning,
  logs,
  resumeHandler,
  instructionCount,
}: {
  isCompiled: boolean;
  isRunning: boolean;
  logs: LogItem[];
  resumeHandler: () => void;
  instructionCount: number;
}) => {
  return (
    <>
      <Stack direction={"row"} style={{ height: "100%", padding: "2%" }}>
        <Box
          p="2%"
          style={{
            height: "70%",
            width: "80%",
          }}
        >
          <LogVisualizer logs={logs} />
        </Box>
        <Box height={"100%"} width={"20%"}>
          <Button
            variant="contained"
            onClick={resumeHandler}
            disabled={!isCompiled || isRunning}
          >
            Resume
          </Button>
          <br />
          {isCompiled ? (
            <Typography variant="h6">
              Instructions Executed: {instructionCount}{" "}
              {isRunning && " (running)"}
            </Typography>
          ) : (
            <Typography variant="h6">Compile program first</Typography>
          )}
        </Box>
      </Stack>
    </>
  );
};
