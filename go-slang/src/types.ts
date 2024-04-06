/*
	This file contains definitions of some interfaces and classes that are used in Goose (such as
	error-related classes).
*/

/**
 * Defines functions that act as built-ins, but might rely on
 * different implementations. e.g display() in a web application.
 */
export interface CustomBuiltIns {
  rawDisplay: (value: Value, str: string, externalContext: any) => Value;
  prompt: (value: Value, str: string, externalContext: any) => string | null;
  alert: (value: Value, str: string, externalContext: any) => void;
  /* Used for list visualisation. See #12 */
  visualiseList: (list: any, externalContext: any) => void;
}

export enum ErrorType {
  RUNTIME = "Runtime",
  SYNTAX = "Syntax",
  TYPE = "Type",
}

export enum ErrorSeverity {
  WARNING = "Warning",
  ERROR = "Error",
}

export type CodeLocation = {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
};

// any and all errors ultimately implement this interface. as such, changes to this will affect every type of error.
export interface GooseError {
  type: ErrorType;
  severity: ErrorSeverity;
  location: CodeLocation;
  explain(): string;
  elaborate(): string;
}

export interface Rule<T extends Node> {
  name: string;
  checkers: {
    [name: string]: (node: T, ancestors: Node[]) => GooseError[];
  };
}

export interface NativeStorage {
  builtins: Map<string, Value>;
  previousProgramsIdentifiers: Set<string>;
  operators: Map<string, (...operands: Value[]) => Value>;
  gpu: Map<string, (...operands: Value[]) => Value>;
  maxExecTime: number;
  evaller: null | ((program: string) => Value);
  /*
  the first time evaller is used, it must be used directly like `eval(code)` to inherit
  surrounding scope, so we cannot set evaller to `eval` directly. subsequent assignments to evaller will
  close in the surrounding values, so no problem
   */
}

export interface Context<T = any> {
  /** The source version used */

  /** The external symbols that exist in the Context. */
  externalSymbols: string[];

  /** All the errors gathered */
  errors: GooseError[];

  /** Runtime Specific state */
  runtime: {
    break: boolean;
    debuggerOn: boolean;
    isRunning: boolean;
    environmentTree: EnvTree;
    environments: Environment[];
    nodes: Node[];
    objectCount: number;
    envStepsTotal: number;
    breakpointSteps: number[];
    changepointSteps: number[];
  };

  numberOfOuterEnvironments: number;

  prelude: string | null;

  /** the state of the debugger */
  debugger: {
    /** External observers watching this context */
    status: boolean;
    state: {
      it: IterableIterator<T>;
      scheduler: Scheduler;
    };
  };

  /**
   * Used for storing external properties.
   * For e.g, this can be used to store some application-related
   * context for use in your own built-in functions (like `display(a)`)
   */
  externalContext?: T;

  /**
   * Used for storing the native context and other values
   */
  nativeStorage: NativeStorage;

  /**
   * Storage container for module specific information and state
   */
  moduleContexts: {
    [name: string]: ModuleContext;
  };

  /**
   * Programs previously executed in this context
   */
  //   previousPrograms: es.Program[];

  /**
   * Whether the evaluation timeout should be increased
   */
  shouldIncreaseEvaluationTimeout: boolean;
}

export type ModuleContext = {
  state: null | any;
  tabs: null | any[];
};

export interface BlockFrame {
  type: string;
  // loc refers to the block defined by every pair of curly braces
  loc?: null;
  // For certain type of BlockFrames, we also want to take into account
  // the code directly outside the curly braces as there
  // may be variables declared there as well, such as in function definitions or for loops
  enclosingLoc?: null;
  children: (DefinitionNode | BlockFrame)[];
}

export interface DefinitionNode {
  name: string;
  type: string;
  loc?: null;
}

// tslint:disable:no-any
export interface Frame {
  [name: string]: any;
}
export type Value = any;
// tslint:enable:no-any

export type AllowedDeclarations = "const" | "let";

export interface Environment {
  readonly id: string;
  name: string;
  tail: Environment | null;
  //   callExpression?: es.CallExpression;
  head: Frame;
  //   heap: Heap;
  thisContext?: Value;
}

export interface Thunk {
  value: any;
  isMemoized: boolean;
  f: () => any;
}

export interface Error {
  status: "error";
}

export interface Finished {
  status: "finished";
  context: Context;
  value: Value;
}

export interface Suspended {
  status: "suspended";
  it: IterableIterator<Value>;
  scheduler: Scheduler;
  context: Context;
}

export type Result = Suspended | Finished | Error;

export interface Scheduler {
  run(it: IterableIterator<Value>, context: Context): Promise<Result>;
}

/**
 * Helper type to recursively make properties that are also objects
 * partial
 *
 * By default, `Partial<Array<T>>` is equivalent to `Array<T | undefined>`. For this type, `Array<T>` will be
 * transformed to Array<Partial<T>> instead
 */
export type RecursivePartial<T> =
  T extends Array<any>
    ? Array<RecursivePartial<T[number]>>
    : T extends Record<any, any>
      ? Partial<{
          [K in keyof T]: RecursivePartial<T[K]>;
        }>
      : T;

export class EnvTree {
  private _root: EnvTreeNode | null = null;
  private map = new Map<Environment, EnvTreeNode>();

  get root(): EnvTreeNode | null {
    return this._root;
  }

  public insert(environment: Environment): void {
    const tailEnvironment = environment.tail;
    if (tailEnvironment === null) {
      if (this._root === null) {
        this._root = new EnvTreeNode(environment, null);
        this.map.set(environment, this._root);
      }
    } else {
      const parentNode = this.map.get(tailEnvironment);
      if (parentNode) {
        const childNode = new EnvTreeNode(environment, parentNode);
        parentNode.addChild(childNode);
        this.map.set(environment, childNode);
      }
    }
  }

  public getTreeNode(environment: Environment): EnvTreeNode | undefined {
    return this.map.get(environment);
  }
}

export class EnvTreeNode {
  private _children: EnvTreeNode[] = [];

  constructor(
    readonly environment: Environment,
    public parent: EnvTreeNode | null
  ) {}

  get children(): EnvTreeNode[] {
    return this._children;
  }

  public resetChildren(newChildren: EnvTreeNode[]): void {
    this.clearChildren();
    this.addChildren(newChildren);
    newChildren.forEach((c) => (c.parent = this));
  }

  private clearChildren(): void {
    this._children = [];
  }

  private addChildren(newChildren: EnvTreeNode[]): void {
    this._children.push(...newChildren);
  }

  public addChild(newChild: EnvTreeNode): EnvTreeNode {
    this._children.push(newChild);
    return newChild;
  }
}
