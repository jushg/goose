import { UNKNOWN_LOCATION } from "./constants";
import { ErrorSeverity, ErrorType, GoslangError, CodeLocation } from "./types";

export class RuntimeGooseError implements GoslangError {
  public type = ErrorType.RUNTIME;
  public severity = ErrorSeverity.ERROR;
  public location: CodeLocation;

  constructor() {
    this.location = UNKNOWN_LOCATION;
  }

  public explain() {
    return "";
  }

  public elaborate() {
    return this.explain();
  }
}

export class InterruptedError extends RuntimeGooseError {
  constructor() {
    super();
  }

  public explain() {
    return "Execution aborted by user.";
  }

  public elaborate() {
    return "TODO";
  }
}
