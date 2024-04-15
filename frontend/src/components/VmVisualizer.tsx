import { Box, Button, Stack, Typography } from "@mui/material";
import { LogItem } from "../hooks/useVmLog";
import { LogVisualizer } from "./LogVisualizer";

export const VmVisualizer = ({
  logs,
  resumeHandler,
  allowResume,
  instructionCount,
}: {
  logs: LogItem[];
  resumeHandler: () => void;
  allowResume: boolean;
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
            disabled={!allowResume}
          >
            Resume
          </Button>
          <Typography variant="h6">
            Instructions Executed: {instructionCount}
          </Typography>
        </Box>
      </Stack>
    </>
  );
};
