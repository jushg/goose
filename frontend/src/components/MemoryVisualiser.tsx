import { Stack } from "@mui/material";
import { useCallback, useState } from "react";
import { ExposeStateReturnType } from "../hooks/useGoSlang";

export const MemoryVisualiser: React.FC<{
  exposeState: () => Promise<ExposeStateReturnType>;
}> = ({ exposeState }) => {
  const [memState, setMemState] = useState("Memory is empty");
  const refreshHandler = useCallback(() => {
    setMemState("Loading...");
    exposeState().then((x) => setMemState(JSON.stringify(x, undefined, "  ")));
  }, [exposeState, setMemState]);

  return (
    <div>
      <Stack direction="column" spacing={1} alignItems="left" padding={1}>
        <button onClick={refreshHandler}>Expose State</button>
        <div>{memState}</div>
      </Stack>
    </div>
  );
};
