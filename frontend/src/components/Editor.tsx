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
func worker(inputCh *int, outputCh *int) {
  id := <-inputCh
  result := id * 2
  outputCh <- result
}
    
func main() {
  numWorkers := 3

  inputCh := make(chan int, numWorkers)
  for i := 0; i < numWorkers; i++ {
    inputCh <- i
  }


  outputCh := make(chan int, 0)
  wg := wgInit()
    
  for i := 0; i < numWorkers; i++ {
    wgAdd(wg)
    go func () {
      worker(inputCh, outputCh); wgDone(wg) 
    }()
  }
    
  for i := 0; i < numWorkers; i++ {
    print(<-outputCh)
  }
  wgWait(wg)
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

  console.info("Editor rendered");
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
