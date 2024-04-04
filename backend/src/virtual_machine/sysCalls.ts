import { AnyGoslingObject } from ".";
import { GoslingMemoryManager } from "./memory";
import { ThreadControlObject } from "./threadControl";

type SysCall<CompileTimeArgs> = ({
  cArgs,
  memory,
  thread,
}: {
  cArgs: CompileTimeArgs;
  memory: GoslingMemoryManager;
  thread: ThreadControlObject;
}) => void;

const Println: SysCall<never> = ({ memory, thread }) => {
  const arg = thread.getOS().pop();
};

const sysCalls = {
  Println: (arg: AnyGoslingObject) => {
    console.log(arg);
  },
};
