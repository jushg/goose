import { Stack } from "@mui/material";
import { TreeItem } from "@mui/x-tree-view";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { HeapAddr, HeapType } from "go-slang/src/memory";
import { useCallback, useState } from "react";
import { ExposeStateReturnType } from "../hooks/useGoSlang";

type Data = {
  [key: string]: number | boolean | string | Data | HeapAddr | HeapType | null;
};

const DataTreeView = ({ tree }: { tree: Data }) => {
  const fn = (obj: Data, recursionLevel: number = 0) =>
    Object.entries(obj).map(([key, value]) => {
      if (value === null) {
        return <TreeItem key={key} itemId={key} label={`${key}: NULL`} />;
      } else if (typeof value === "object" && "_a" in value) {
        // HeapAddr
        return (
          <TreeItem
            key={key}
            itemId={key + (Math.random() * 10000).toString()}
            label={`${key}: ${value._a}`}
          />
        );
      } else if (typeof value === "object") {
        if (recursionLevel > 10) {
          return (
            <TreeItem
              key={key}
              itemId={key + (Math.random() * 10000).toString()}
              label={`${key}: ${JSON.stringify(value)}`}
            />
          );
        }
        return (
          <TreeItem
            key={key}
            itemId={key + (Math.random() * 10000).toString()}
            label={key}
          >
            {fn(value as Data, recursionLevel + 1)}
          </TreeItem>
        );
      } else {
        return (
          <TreeItem
            key={key}
            itemId={key + (Math.random() * 10000).toString()}
            label={`${key}: ${value}`}
          />
        );
      }
    });

  return <SimpleTreeView>{fn(tree)}</SimpleTreeView>;
};

export const MemoryVisualiser: React.FC<{
  exposeState: () => Promise<ExposeStateReturnType>;
}> = ({ exposeState }) => {
  const [memState, setMemState] = useState<Data>({});
  const refreshHandler = useCallback(() => {
    setMemState({ loading: true });
    exposeState().then((x) => setMemState(x));
  }, [exposeState, setMemState]);

  return (
    <div>
      <Stack direction="column" spacing={1} alignItems="left" padding={1}>
        <button onClick={refreshHandler}>Expose State</button>
        <DataTreeView tree={memState} />
      </Stack>
    </div>
  );
};
