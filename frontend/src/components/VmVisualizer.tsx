import { Box, Stack, Typography } from "@mui/material";
import { LogItem } from "../hooks/useVmLog";
import { LogVisualizer } from "./LogVisualizer";

export type VmStatus =
  | "NOT_COMPILED"
  | "COMPILED"
  | "RUNNING"
  | "PAUSED"
  | "FINISHED"
  | "ERROR";

export const VmVisualizer = ({
  errorMessageIfAny,
  vmStatus,
  logs,
  instructionCount,
}: {
  errorMessageIfAny: string | null;
  vmStatus: VmStatus;
  logs: LogItem[];
  instructionCount: number;
}) => {
  console.info("VmVisualizer rendered");
  return (
    <Box maxHeight={"85vh"} minHeight={"85vh"} overflow={"auto"}>
      <Stack direction={"column"} spacing={1} padding={1}>
        <Typography variant="h6">Execution Status: {vmStatus}</Typography>
        {vmStatus === "NOT_COMPILED" ? (
          <Typography variant="caption">Compile program first</Typography>
        ) : (
          <Typography variant="h6">
            Instructions Executed: {instructionCount}
          </Typography>
        )}

        {errorMessageIfAny && (
          <>
            <br />
            <br />
            <Typography variant="h6" color="error" marginTop={"-50px"}>
              {errorMessageIfAny}
            </Typography>
          </>
        )}
        <LogVisualizer logs={logs} />
      </Stack>
    </Box>
  );
};
