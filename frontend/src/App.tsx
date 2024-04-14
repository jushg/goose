import { useEffect, useMemo } from "react";
import "./App.css";
import { useCompiler, useVm } from "./lib/useGoSlang";

function App() {
  const { setGooseCode, compiledFile, state: compilerState } = useCompiler();
  const vmOptions = useMemo(() => ({ compiledFile }), [compiledFile]);
  const { executeStep, log } = useVm(vmOptions);

  useEffect(() => {
    setGooseCode(`
        func main() {
          print("k");
        }
      `);
  }, []);

  useEffect(() => {
    if (!compiledFile) return;
    console.log("executing");
    executeStep("");
  }, [compiledFile]);

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
      </header>
    </div>
  );
}

export default App;
