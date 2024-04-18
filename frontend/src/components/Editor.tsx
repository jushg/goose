import { Box, Button, Stack} from "@mui/material";
import { useCallback, useState } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { basicDark } from '@uiw/codemirror-theme-basic';
import { StreamLanguage } from '@codemirror/language';
import { go } from '@codemirror/legacy-modes/mode/go';
import { EditorView } from "@codemirror/view";
import { VmStatus } from "./VmVisualizer";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faForward, faRefresh } from '@fortawesome/free-solid-svg-icons';

export const Editor = ({
  vmStatus,
  setIsCompiled,
  setGooseCode,
  resetVm,
  resumeHandler,
}: {
  vmStatus: VmStatus;
  setIsCompiled: (e: boolean) => void;
  setGooseCode: (code: string) => void;
  resetVm: () => void;
  resumeHandler: () => void;
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

  const compileBtnHandler = useCallback(() => {
    setIsCompiled(true);
    setGooseCode(codeStr);
  }, [setIsCompiled, setGooseCode, codeStr]);

  console.info("Editor rendered");
  return (
      <Box height={"100%"} width={"100%"} >
        <Stack direction="column" spacing={1}>
        <Stack direction="row" spacing={1} paddingTop={1} paddingLeft={1}>
          <Button variant="contained" onClick={compileBtnHandler}>
            <FontAwesomeIcon icon={faBook} style={{ marginRight: '5px' }} />
              Compile 
          </Button>

          <Button
            variant="contained"
            onClick={resumeHandler}
            disabled={vmStatus !== "COMPILED" && vmStatus !== "PAUSED"}
          >
            <FontAwesomeIcon icon={faForward} style={{ marginRight: '5px' }} />
              {vmStatus === "PAUSED" ? "Resume" : "Start"}
          </Button>
          <Button
            variant="outlined"
            onClick={resetVm}
            disabled={vmStatus === "NOT_COMPILED"}
          >
            <FontAwesomeIcon icon={faRefresh} style={{ marginRight: '5px' }} />
              Reset
          </Button>

        </Stack>
        <CodeMirror
            value={codeStr}
            style={{ maxHeight: "80vh", height: "100%", overflow: "auto"}}
            onChange={(value) => {
                setCodeStr(value);
                setIsCompiled(false);
                localStorage.setItem("code", value);
            }}
            extensions={[EditorView.lineWrapping]}
            theme={basicDark}
        />
      </Stack>  
    </Box>
  );
};
