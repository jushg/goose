import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { LogItem } from "./lib/useVmLog";

export const VmVizualizer = ({
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
            height: "80%",
            width: "80%",
            overflow: "scroll",
          }}
        >
          <Typography variant="h6">Logs</Typography>
          <List>
            {logs.map((log, i) => (
              <>
                <ListItem key={i}>
                  <Typography
                    style={{
                      whiteSpace: "pre-line",
                      width: "100%",
                      overflow: "scroll",
                    }}
                  >
                    {JSON.stringify(log).slice(0, 100)}
                  </Typography>
                </ListItem>
                <Divider />
              </>
            ))}
          </List>
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
