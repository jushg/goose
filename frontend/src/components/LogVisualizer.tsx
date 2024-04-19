import Typography from "@mui/material/Typography";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { LogItem } from "../hooks/useVmLog";

export const LogVisualizer = ({ logs }: { logs: LogItem[] }) => {
  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 10 },
    { field: "timestamp", headerName: "Time", width: 150 },
    { field: "from", headerName: "From", width: 200 },
    { field: "log", headerName: "Log", width: 150 },
  ];
  const rows = logs.map((log, id) => ({
    id,
    timestamp: log.timestamp,
    from:
      "threadId" in log.ctx ? `tID: ${log.ctx.threadId}` : log.ctx.component,
    log: log.message,
  }));

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      style={{ minHeight: "30vh" }}
    ></DataGrid>
  );
};
