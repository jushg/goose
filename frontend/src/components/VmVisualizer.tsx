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
  resetVm,
  errorMessageIfAny,
  vmStatus,
  logs,
  resumeHandler,
  instructionCount,
}: {
  resetVm: () => void;
  errorMessageIfAny: string | null;
  vmStatus: VmStatus;
  logs: LogItem[];
  resumeHandler: () => void;
  instructionCount: number;
}) => {
  console.info("VmVisualizer rendered");
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
          <Stack direction={"row"} spacing={2}>
            <Button
              variant="contained"
              onClick={resumeHandler}
              disabled={vmStatus !== "COMPILED" && vmStatus !== "PAUSED"}
            >
              {vmStatus === "PAUSED" ? "Resume" : "Start"}
            </Button>
            <Button
              variant="outlined"
              onClick={resetVm}
              disabled={vmStatus === "NOT_COMPILED"}
            >
              Reset
            </Button>
          </Stack>
          <br />
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
        </Box>
      </Stack>
    </>
  );
};
