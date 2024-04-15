import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { CompiledFile } from "go-slang/src/common/compiledFile";
import { useCallback, useState } from "react";
import { CompilationState } from "../hooks/useGoSlang";
import { InstrVisualiser } from "./InstrVisualiser";

export const Editor = ({
  isCompiled,
  setIsCompiled,
  setGooseCode,
  compiledFile,
  compilationState,
  setBreakpoints,
}: {
  isCompiled: boolean;
  setIsCompiled: (e: boolean) => void;
  setGooseCode: (code: string) => void;
  compiledFile: CompiledFile | null;
  compilationState: CompilationState;
  setBreakpoints: (breakpoints: number[]) => void;
}) => {
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

  const textFieldHandler = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCodeStr(e.target.value);
      setIsCompiled(false);
    },
    [setCodeStr, setIsCompiled]
  );
  const compileBtnHandler = useCallback(() => {
    setIsCompiled(true);
    setGooseCode(codeStr);
  }, [setIsCompiled, setGooseCode, codeStr]);

  return (
    <>
      <Stack direction={"row"} style={{ height: "100%", padding: "2%" }}>
        <Box height={"100%"} width={"100%"}>
          <TextField
            multiline
            sx={{
              width: "100%",
              minHeight: "50vh",
              maxHeight: "50vh",
              paddingBottom: "2%",
              spellcheck: "false",
            }}
            inputProps={{
              style: {
                minHeight: "50vh",
                maxHeight: "50vh",
                fontFamily: "monospace",
                overflow: "scroll",
              },
              spellCheck: false,
            }}
            InputProps={{
              style: {
                minHeight: "50vh",
                maxHeight: "50vh",
                fontFamily: "monospace",
                overflow: "scroll",
              },
            }}
            value={codeStr}
            onChange={textFieldHandler}
          />
          <Button variant="contained" onClick={compileBtnHandler}>
            Compile
          </Button>
        </Box>
        <Box
          p="2%"
          style={{
            height: "80%",
            width: "100%",
            overflow: "scroll",
          }}
        >
          <Typography variant="h6">Instructions</Typography>
          {!isCompiled ? (
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
        </Box>
      </Stack>
    </>
  );
};
