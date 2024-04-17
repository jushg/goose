import { Box, Button, Stack, Typography } from "@mui/material";
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
    <Stack direction={"column"} spacing={2}>
            {vmStatus === "NOT_COMPILED" ? (
              <Typography variant="h6">Compile program first</Typography>
            ) : (
              <Typography variant="h6">
                Instructions Executed: {instructionCount} ({vmStatus})
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
  );
};
