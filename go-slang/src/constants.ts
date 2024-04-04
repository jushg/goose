import { CodeLocation } from "./types";

export const UNKNOWN_LOCATION: CodeLocation = {
  start: {
    line: -1,
    column: -1,
  },
  end: {
    line: -1,
    column: -1,
  },
};
