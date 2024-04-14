import { useEffect } from "react";
import "./App.css";
import { useCompiler, useVm } from "./lib/useGoSlang";

function App() {
  const { setGooseCode, compiledFile, state: compilerState } = useCompiler();
  const { executeStep, log } = useVm(compiledFile);

  useEffect(() => {
    setGooseCode(`
        func main() {
          print("k");
        }
      `);
  }, []);

  useEffect(() => {
    if (!compiledFile) return;
    let maxInstr = 100_000;
    while (maxInstr-- > 0) {
      console.log("executing");
      executeStep();
    }
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
