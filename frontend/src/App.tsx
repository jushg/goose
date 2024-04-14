import { useEffect, useMemo } from "react";
import "./App.css";
import { useCompiler, useVm, useVmOptions } from "./lib/useGoSlang";

function App() {
  const { setGooseCode, compiledFile, state: compilerState } = useCompiler();
  const vmOptions = useMemo<useVmOptions>(
    () => ({ compiledFile, breakpoints: [1] }),
    [compiledFile]
  );
  const { executeStep, log, resumeKey } = useVm(vmOptions);

  useEffect(() => {
    setGooseCode(`
        func main() {
          print("k");
        }
      `);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <p>{compilerState}</p>
        <br />
        <p>Log Length: {log.length}</p>
        <br />
        Log:
        <br />
        {log.map((l) => (
          <p>{JSON.stringify(l)}</p>
        ))}
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <button
          onClick={() => {
            console.info("'Resume' button clicked");
            if (!compiledFile) return;

            console.log("executing");
            executeStep(resumeKey).then((timepoint) => {
              console.info(`execution done: ${JSON.stringify(timepoint)}`);
            });
          }}
        >
          Resume
        </button>
      </header>
    </div>
  );
}

export default App;
