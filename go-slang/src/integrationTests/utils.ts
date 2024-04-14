import { compileParsedProgram } from "../compiler";
import { parse } from "../parser";
import { initializeVirtualMachine } from "../virtual_machine";

export const setUpTest = (progStr: string) => {
  const log: Record<string, string[]> = {};
  const prog = compileParsedProgram(parse(progStr));
  let state = initializeVirtualMachine(prog, (2 ** 8) ** 2, (ctx, s) => {
    const pushLog = (id: string, s: string) => {
      if (!log[id]) log[id] = [];
      log[id].push(s);
    };
    "threadId" in ctx ? pushLog(ctx.threadId, s) : pushLog(ctx.component, s);
  });

  const getId = () => state.jobState.getId();
  const getMemory = () => state.machineState.HEAP;
  const getThread = () => state.jobState;
  const getPC = () => state.jobState.getPC().addr;
  const _getRts = () => getThread().getRTS().toString();

  return {
    log,
    prog,
    state,
    getId,
    getMemory,
    getThread,
    getPC,
    _getRts,
  };
};
