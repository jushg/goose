import { DataGrid, DataGridProps, GridColDef } from "@mui/x-data-grid";
import { CompiledFile } from "go-slang/src/common/compiledFile";
import { useCallback } from "react";

const stringify = (instr: any) => {
  if (typeof instr !== "object") return `${instr}`;
  return Object.keys(instr)
    .filter((key) => key !== "op" && key !== "tag")
    .map((key) => {
      let val = (instr as any)[key];
      if (val === undefined || val === null) val = "-";
      else if (typeof val === "object" && "addr" in val) val = val.addr;
      else if (typeof val === "object" && Array.isArray(val)) {
        val = `[${val.map(stringify).join(", ")}]`;
      } else if (typeof val === "object") {
        val = Object.keys(val)
          .map((k) => `${k}: ${stringify(val[k])}`)
          .join(", ");
      }
      return `${key}: ${val}`;
    })
    .join(", ");
};

type HandleSelectionModelChangeType = Exclude<
  DataGridProps["onRowSelectionModelChange"],
  undefined
>;

export const InstrVisualiser = ({
  compiledFile,
  setBreakpoints,
}: {
  compiledFile: CompiledFile;
  setBreakpoints: (breakpoints: number[]) => void;
}) => {
  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 60 },
    { field: "op", headerName: "OpCode", width: 120 },
    { field: "data", headerName: "Data", width: 420 },
  ];
  const rows = compiledFile.instructions.map((instr, id) => ({
    id,
    op: instr.op,
    data: stringify(instr),
  }));

  const handleSelectionModelChange: DataGridProps["onRowSelectionModelChange"] =
    useCallback<HandleSelectionModelChangeType>(
      (model, _detail) => {
        const ids = new Set(model);
        setBreakpoints(
          [...ids].map((id: string | number) => parseInt(`${id}`))
        );
      },

      [setBreakpoints]
    );

  return (
    <>
      <DataGrid
        rows={rows}
        columns={columns}
        style={{ height: "90%" }}
        checkboxSelection
        onRowSelectionModelChange={handleSelectionModelChange}
      ></DataGrid>
    </>
  );
};
