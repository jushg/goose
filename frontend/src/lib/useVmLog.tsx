import { SetStateAction, useCallback, useState } from "react";

export type LogItem = {
  ctx: { threadId: string } | { component: string };
  message: string;
  timestamp: string;
};

const appendLogHelper: (
  ctx: LogItem["ctx"],
  message: string
) => SetStateAction<LogItem[]> = (ctx, message) => (prevLog) => {
  const d = new Date();
  return [
    ...prevLog,
    {
      ctx,
      message,
      timestamp: `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`,
    },
  ];
};

export const useVmLogs = () => {
  const [log, setLog] = useState<LogItem[]>([]);
  const appendLog = useCallback(
    (ctx: LogItem["ctx"], message: string) => {
      setLog(appendLogHelper(ctx, message));
    },
    [setLog]
  );
  const resetLog = useCallback(() => {
    setLog([]);
  }, [setLog]);

  return { log, appendLog, resetLog };
};
