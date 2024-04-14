import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CompiledFile } from "go-slang/src/common/compiledFile";
import { useState } from "react";
import { CompilationState } from "./lib/useGoSlang";

export const Editor = ({
  setGooseCode,
  compiledFile,
  compilationState,
}: {
  setGooseCode: (code: string) => void;
  compiledFile: CompiledFile | null;
  compilationState: CompilationState;
}) => {
  const [hasBeenCompiled, setHasBeenCompiled] = useState<boolean>(false);
  const [codeStr, setCodeStr] = useState<string>(`
  var x int

  func main() {
    go goo(&x)
    x = 5
    go goo(&x)

    for i := 0; i < 10; i++ { yield() }
  }

  func goo(x *int) {
    print(*x)
  }
  `);
  return (
    <>
      <Stack direction={"row"} style={{ height: "100%", padding: "2%" }}>
        <Box height={"100%"} width={"100%"}>
          <TextField
            multiline
            minRows={19}
            maxRows={19}
            sx={{
              width: "100%",
              paddingBottom: "2%",
            }}
            inputProps={{
              spellCheck: "false",
              style: { fontFamily: "monospace" },
            }}
            value={codeStr}
            onChange={(e) => setCodeStr(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={() => (setHasBeenCompiled(true), setGooseCode(codeStr))}
          >
            Compile
          </Button>
        </Box>
        <Box
          p="2%"
          style={{
            height: "80%",
            width: "40%",
            overflow: "scroll",
          }}
        >
          <Typography variant="h6">Instructions</Typography>
          {hasBeenCompiled && compilationState === "PARSE_FAILED" && (
            <Typography>Parse failed</Typography>
          )}
          {hasBeenCompiled && compilationState === "COMPILATION_FAILED" && (
            <Typography>Compilation failed</Typography>
          )}
          {hasBeenCompiled && compilationState === "COMPILED" && (
            <List>
              {compiledFile &&
                compiledFile.instructions.map((instruction, i) => (
                  <>
                    <ListItem key={i}>
                      <Typography
                        style={{
                          whiteSpace: "pre-line",
                          width: "100%",
                          overflow: "scroll",
                        }}
                      >
                        {JSON.stringify(instruction).slice(0, 100)}
                      </Typography>
                    </ListItem>
                    <Divider />
                  </>
                ))}
            </List>
          )}
          {!hasBeenCompiled && (
            <Typography>Compile to see instructions</Typography>
          )}
        </Box>
      </Stack>
    </>
  );
};
