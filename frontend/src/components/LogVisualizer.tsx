import Typography from "@mui/material/Typography";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { LogItem } from "../hooks/useVmLog";

export const LogVisualizer = ({ logs }: { logs: LogItem[] }) => {
  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 10 },
    { field: "timestamp", headerName: "Time", width: 100 },
    { field: "from", headerName: "From", width: 70 },
    { field: "log", headerName: "Log", width: 200 },
  ];
  const rows = logs.map((log, id) => ({
    id,
    timestamp: log.timestamp,
    from:
      "threadId" in log.ctx ? `tID: ${log.ctx.threadId}` : log.ctx.component,
    log: log.message,
  }));

  return (
    <>
      <Typography variant="h6" marginTop="-24px">
        Logs
      </Typography>
      <DataGrid rows={rows} columns={columns}></DataGrid>
    </>
  );
};
