import { FSModule } from 'browserfs/dist/node/core/FS';
import { Context, findDeclaration, getNames, interrupt, resume, runFilesInContext } from 'go-slang';
import { defineSymbol } from 'js-slang/dist/createContext';
import { InterruptedError } from 'js-slang/dist/errors/errors';
import { parse } from 'js-slang/dist/parser/parser';
import { manualToggleDebugger } from 'js-slang/dist/stdlib/inspector';
import { Chapter, Variant } from 'js-slang/dist/types';
import Phaser from 'phaser';
import { SagaIterator } from 'redux-saga';
import { call, put, race, select, StrictEffect, take } from 'redux-saga/effects';
import DataVisualizer from '../../features/dataVisualizer/dataVisualizer';
import { WORKSPACE_BASE_PATHS } from '../../pages/fileSystem/createInBrowserFileSystem';
import {
  defaultEditorValue,
  isSourceLanguage,
  OverallState
} from '../application/ApplicationTypes';
import { externalLibraries, ExternalLibraryName } from '../application/types/ExternalTypes';
import {
  BEGIN_DEBUG_PAUSE,
  BEGIN_INTERRUPT_EXECUTION,
  DEBUG_RESET,
  DEBUG_RESUME,
  UPDATE_EDITOR_HIGHLIGHTED_LINES,
  UPDATE_EDITOR_HIGHLIGHTED_LINES_CONTROL
} from '../application/types/InterpreterTypes';
import { Library } from '../assessment/AssessmentTypes';
import { Documentation } from '../documentation/Documentation';
import { retrieveFilesInWorkspaceAsRecord, writeFileRecursively } from '../fileSystem/utils';
import { actions } from '../utils/ActionsHelper';
import DisplayBufferService from '../utils/DisplayBufferService';
import {
  getBlockExtraMethodsString,
  getDifferenceInMethods,
  getRestoreExtraMethodsString,
  getStoreExtraMethodsString,
  highlightClean,
  highlightCleanForControl,
  highlightLine,
  highlightLineForControl,
  makeElevatedContext
} from '../utils/JsSlangHelper';
import { showSuccessMessage, showWarningMessage } from '../utils/notifications/NotificationsHelper';

import { notifyProgramEvaluated } from '../workspace/WorkspaceActions';
import {
  ADD_HTML_CONSOLE_ERROR,
  BEGIN_CLEAR_CONTEXT,
  EditorTabState,
  END_CLEAR_CONTEXT,
  EVAL_EDITOR,
  EVAL_REPL,
  EVAL_SILENT,
  NAV_DECLARATION,
  PLAYGROUND_EXTERNAL_SELECT,
  PROMPT_AUTOCOMPLETE,
  SET_FOLDER_MODE,
  TOGGLE_EDITOR_AUTORUN,
  TOGGLE_FOLDER_MODE,
  UPDATE_EDITOR_VALUE,
  WorkspaceLocation
} from '../workspace/WorkspaceTypes';
import { safeTakeEvery as takeEvery } from './SafeEffects';

export default function* GoslangWorkspaceSaga(): SagaIterator {
  let context: Context;

  yield takeEvery(
    ADD_HTML_CONSOLE_ERROR,
    function* (action: ReturnType<typeof actions.addHtmlConsoleError>) {
      yield put(
        actions.handleConsoleLog(action.payload.workspaceLocation, action.payload.errorMsg)
      );
    }
  );

  yield takeEvery(
    TOGGLE_FOLDER_MODE,
    function* (action: ReturnType<typeof actions.toggleFolderMode>) {
      const workspaceLocation = action.payload.workspaceLocation;
      const isFolderModeEnabled: boolean = yield select(
        (state: OverallState) => state.workspaces[workspaceLocation].isFolderModeEnabled
      );
      yield put(actions.setFolderMode(workspaceLocation, !isFolderModeEnabled));
      const warningMessage = `Folder mode ${!isFolderModeEnabled ? 'enabled' : 'disabled'}`;
      yield call(showWarningMessage, warningMessage, 750);
    }
  );

  yield takeEvery(SET_FOLDER_MODE, function* (action: ReturnType<typeof actions.setFolderMode>) {
    const workspaceLocation = action.payload.workspaceLocation;
    const isFolderModeEnabled: boolean = yield select(
      (state: OverallState) => state.workspaces[workspaceLocation].isFolderModeEnabled
    );
    // Do nothing if Folder mode is enabled.
    if (isFolderModeEnabled) {
      return;
    }

    const editorTabs: EditorTabState[] = yield select(
      (state: OverallState) => state.workspaces[workspaceLocation].editorTabs
    );
    // If Folder mode is disabled and there are no open editor tabs, add an editor tab.
    if (editorTabs.length === 0) {
      const defaultFilePath = `${WORKSPACE_BASE_PATHS[workspaceLocation]}/program.js`;
      const fileSystem: FSModule | null = yield select(
        (state: OverallState) => state.fileSystem.inBrowserFileSystem
      );
      // If the file system is not initialised, add an editor tab with the default editor value.
      if (fileSystem === null) {
        yield put(actions.addEditorTab(workspaceLocation, defaultFilePath, defaultEditorValue));
        return;
      }
      const editorValue: string = yield new Promise((resolve, reject) => {
        fileSystem.exists(defaultFilePath, fileExists => {
          if (!fileExists) {
            // If the file does not exist, we need to also create it in the file system.
            writeFileRecursively(fileSystem, defaultFilePath, defaultEditorValue)
              .then(() => resolve(defaultEditorValue))
              .catch(err => reject(err));
            return;
          }
          fileSystem.readFile(defaultFilePath, 'utf-8', (err, fileContents) => {
            if (err) {
              reject(err);
              return;
            }
            if (fileContents === undefined) {
              reject(new Error('File exists but has no contents.'));
              return;
            }
            resolve(fileContents);
          });
        });
      });
      yield put(actions.addEditorTab(workspaceLocation, defaultFilePath, editorValue));
    }
  });

  // Mirror editor updates to the associated file in the filesystem.
  yield takeEvery(
    UPDATE_EDITOR_VALUE,
    function* (action: ReturnType<typeof actions.updateEditorValue>) {
      const workspaceLocation = action.payload.workspaceLocation;
      const editorTabIndex = action.payload.editorTabIndex;

      const filePath: string | undefined = yield select(
        (state: OverallState) =>
          state.workspaces[workspaceLocation].editorTabs[editorTabIndex].filePath
      );
      // If the code does not have an associated file, do nothing.
      if (filePath === undefined) {
        return;
      }

      const fileSystem: FSModule | null = yield select(
        (state: OverallState) => state.fileSystem.inBrowserFileSystem
      );
      // If the file system is not initialised, do nothing.
      if (fileSystem === null) {
        return;
      }

      fileSystem.writeFile(filePath, action.payload.newEditorValue, err => {
        if (err) {
          console.error(err);
        }
      });
      yield;
    }
  );

  yield takeEvery(EVAL_EDITOR, function* (action: ReturnType<typeof actions.evalEditor>) {
    const workspaceLocation = action.payload.workspaceLocation;
    yield* evalEditor(workspaceLocation);
  });

  yield takeEvery(
    PROMPT_AUTOCOMPLETE,
    function* (action: ReturnType<typeof actions.promptAutocomplete>): any {
      const workspaceLocation = action.payload.workspaceLocation;

      context = yield select((state: OverallState) => state.workspaces[workspaceLocation].context);

      const code: string = yield select((state: OverallState) => {
        const prependCode = state.workspaces[workspaceLocation].programPrependValue;
        // TODO: Hardcoded to make use of the first editor tab. Rewrite after editor tabs are added.
        const editorCode = state.workspaces[workspaceLocation].editorTabs[0].value;
        return [prependCode, editorCode] as [string, string];
      });
      const [prepend, editorValue] = code;

      // Deal with prepended code
      let autocompleteCode;
      let prependLength = 0;
      if (!prepend) {
        autocompleteCode = editorValue;
      } else {
        prependLength = prepend.split('\n').length;
        autocompleteCode = prepend + '\n' + editorValue;
      }

      const [editorNames, displaySuggestions] = yield call(
        getNames,
        autocompleteCode,
        action.payload.row + prependLength,
        action.payload.column,
        context
      );

      if (!displaySuggestions) {
        yield call(action.payload.callback);
        return;
      }

      const editorSuggestions = editorNames.map((name: any) => {
        return {
          ...name,
          caption: name.name,
          value: name.name,
          score: name.score ? name.score + 1000 : 1000, // Prioritize suggestions from code
          name: undefined
        };
      });

      let chapterName = context.chapter.toString();
      const variant = context.variant ?? Variant.DEFAULT;
      if (variant !== Variant.DEFAULT) {
        chapterName += '_' + variant;
      }

      const builtinSuggestions = Documentation.builtins[chapterName] || [];

      const extLib = yield select(
        (state: OverallState) => state.workspaces[workspaceLocation].externalLibrary
      );

      const extLibSuggestions = Documentation.externalLibraries[extLib] || [];

      yield call(
        action.payload.callback,
        null,
        editorSuggestions.concat(builtinSuggestions, extLibSuggestions)
      );
    }
  );

  yield takeEvery(
    TOGGLE_EDITOR_AUTORUN,
    function* (action: ReturnType<typeof actions.toggleEditorAutorun>): any {
      const workspaceLocation = action.payload.workspaceLocation;
      const isEditorAutorun = yield select(
        (state: OverallState) => state.workspaces[workspaceLocation].isEditorAutorun
      );
      yield call(showWarningMessage, 'Autorun ' + (isEditorAutorun ? 'Started' : 'Stopped'), 750);
    }
  );

  yield takeEvery(EVAL_REPL, function* (action: ReturnType<typeof actions.evalRepl>) {
    const workspaceLocation = action.payload.workspaceLocation;
    const code: string = yield select(
      (state: OverallState) => state.workspaces[workspaceLocation].replValue
    );
    const execTime: number = yield select(
      (state: OverallState) => state.workspaces[workspaceLocation].execTime
    );
    yield put(actions.beginInterruptExecution(workspaceLocation));
    yield put(actions.clearReplInput(workspaceLocation));
    yield put(actions.sendReplInputToOutput(code, workspaceLocation));
    context = yield select((state: OverallState) => state.workspaces[workspaceLocation].context);
    // Reset old context.errors
    context.errors = [];
    const codeFilePath = '/code.js';
    const codeFiles = {
      [codeFilePath]: code
    };
    yield call(evalCode, codeFiles, codeFilePath, context, execTime, workspaceLocation, EVAL_REPL);
  });

  yield takeEvery(DEBUG_RESUME, function* (action: ReturnType<typeof actions.debuggerResume>) {
    const workspaceLocation = action.payload.workspaceLocation;
    const code: string = yield select(
      // TODO: Hardcoded to make use of the first editor tab. Rewrite after editor tabs are added.
      (state: OverallState) => state.workspaces[workspaceLocation].editorTabs[0].value
    );
    const execTime: number = yield select(
      (state: OverallState) => state.workspaces[workspaceLocation].execTime
    );
    yield put(actions.beginInterruptExecution(workspaceLocation));
    /** Clear the context, with the same chapter and externalSymbols as before. */
    yield put(actions.clearReplOutput(workspaceLocation));
    context = yield select((state: OverallState) => state.workspaces[workspaceLocation].context);
    // TODO: Hardcoded to make use of the first editor tab. Rewrite after editor tabs are added.
    yield put(actions.setEditorHighlightedLines(workspaceLocation, 0, []));
    const codeFilePath = '/code.js';
    const codeFiles = {
      [codeFilePath]: code
    };
    yield call(
      evalCode,
      codeFiles,
      codeFilePath,
      context,
      execTime,
      workspaceLocation,
      DEBUG_RESUME
    );
  });

  yield takeEvery(DEBUG_RESET, function* (action: ReturnType<typeof actions.debuggerReset>) {
    const workspaceLocation = action.payload.workspaceLocation;
    context = yield select((state: OverallState) => state.workspaces[workspaceLocation].context);
    yield put(actions.clearReplOutput(workspaceLocation));
    // TODO: Hardcoded to make use of the first editor tab. Rewrite after editor tabs are added.
    yield put(actions.setEditorHighlightedLines(workspaceLocation, 0, []));
    context.runtime.break = false;
    lastDebuggerResult = undefined;
  });

  yield takeEvery(
    UPDATE_EDITOR_HIGHLIGHTED_LINES,
    function* (action: ReturnType<typeof actions.setEditorHighlightedLines>) {
      const newHighlightedLines = action.payload.newHighlightedLines;
      if (newHighlightedLines.length === 0) {
        highlightClean();
      } else {
        try {
          newHighlightedLines.forEach(([startRow, endRow]: [number, number]) => {
            for (let row = startRow; row <= endRow; row++) {
              highlightLine(row);
            }
          });
        } catch (e) {
          // Error most likely caused by trying to highlight the lines of the prelude
          // in CSE Machine. Can be ignored.
        }
      }
      yield;
    }
  );

  yield takeEvery(
    UPDATE_EDITOR_HIGHLIGHTED_LINES_CONTROL,
    function* (action: ReturnType<typeof actions.setEditorHighlightedLines>) {
      const newHighlightedLines = action.payload.newHighlightedLines;
      if (newHighlightedLines.length === 0) {
        yield call(highlightCleanForControl);
      } else {
        try {
          for (const [startRow, endRow] of newHighlightedLines) {
            for (let row = startRow; row <= endRow; row++) {
              yield call(highlightLineForControl, row);
            }
          }
        } catch (e) {
          // Error most likely caused by trying to highlight the lines of the prelude
          // in CSE Machine. Can be ignored.
        }
      }
    }
  );

  /**
   * Note that the PLAYGROUND_EXTERNAL_SELECT action is made to
   * select the library for playground.
   * This is because assessments do not have a chapter & library select, the question
   * specifies the chapter and library to be used.
   *
   * To abstract this to assessments, the state structure must be manipulated to store
   * the external library name in a WorkspaceState (as compared to IWorkspaceManagerState).
   *
   * @see IWorkspaceManagerState @see WorkspaceState
   */
  yield takeEvery(
    PLAYGROUND_EXTERNAL_SELECT,
    function* (action: ReturnType<typeof actions.externalLibrarySelect>) {
      const { workspaceLocation, externalLibraryName: newExternalLibraryName } = action.payload;
      const [chapter, globals, oldExternalLibraryName]: [
        Chapter,
        Array<[string, any]>,
        ExternalLibraryName
      ] = yield select((state: OverallState) => [
        state.workspaces[workspaceLocation].context.chapter,
        state.workspaces[workspaceLocation].globals,
        state.workspaces[workspaceLocation].externalLibrary
      ]);
      const symbols = externalLibraries.get(newExternalLibraryName)!;
      const library: Library = {
        chapter,
        external: {
          name: newExternalLibraryName,
          symbols
        },
        globals
      };
      if (newExternalLibraryName !== oldExternalLibraryName || action.payload.initialise) {
        yield put(actions.changeExternalLibrary(newExternalLibraryName, workspaceLocation));
        yield put(actions.beginClearContext(workspaceLocation, library, true));
        yield put(actions.clearReplOutput(workspaceLocation));
        if (!action.payload.initialise) {
          yield call(showSuccessMessage, `Switched to ${newExternalLibraryName} library`, 1000);
        }
      }
    }
  );

  /**
   * Handles the side effect of resetting the WebGL context when context is reset.
   *
   * @see webGLgraphics.js under 'public/externalLibs/graphics' for information on
   * the function.
   */
  yield takeEvery(
    BEGIN_CLEAR_CONTEXT,
    function* (action: ReturnType<typeof actions.beginClearContext>) {
      yield call([DataVisualizer, DataVisualizer.clear]);
      const globals: Array<[string, any]> = action.payload.library.globals as Array<[string, any]>;
      for (const [key, value] of globals) {
        window[key] = value;
      }
      yield put(
        actions.endClearContext(
          {
            ...action.payload.library,
            moduleParams: {
              runes: {},
              phaser: Phaser
            }
          },
          action.payload.workspaceLocation
        )
      );
      yield undefined;
    }
  );

  yield takeEvery(
    NAV_DECLARATION,
    function* (action: ReturnType<typeof actions.navigateToDeclaration>) {
      const workspaceLocation = action.payload.workspaceLocation;
      const code: string = yield select(
        // TODO: Hardcoded to make use of the first editor tab. Rewrite after editor tabs are added.
        (state: OverallState) => state.workspaces[workspaceLocation].editorTabs[0].value
      );
      context = yield select((state: OverallState) => state.workspaces[workspaceLocation].context);

      const result = findDeclaration(code, context, {
        line: action.payload.cursorPosition.row + 1,
        column: action.payload.cursorPosition.column
      });
      if (result) {
        // TODO: Hardcoded to make use of the first editor tab. Rewrite after editor tabs are added.
        yield put(
          actions.moveCursor(action.payload.workspaceLocation, 0, {
            row: result.start.line - 1,
            column: result.start.column
          })
        );
      }
    }
  );
}

let lastDebuggerResult: any;
function* updateInspector(workspaceLocation: WorkspaceLocation): SagaIterator {
  try {
    const row = lastDebuggerResult.context.runtime.nodes[0].loc.start.line - 1;
    // TODO: Hardcoded to make use of the first editor tab. Rewrite after editor tabs are added.
    yield put(actions.setEditorHighlightedLines(workspaceLocation, 0, []));
    // We highlight only one row to show the current line
    // If we highlight from start to end, the whole program block will be highlighted at the start
    // since the first node is the program node
    yield put(actions.setEditorHighlightedLines(workspaceLocation, 0, [[row, row]]));
  } catch (e) {
    // TODO: Hardcoded to make use of the first editor tab. Rewrite after editor tabs are added.
    yield put(actions.setEditorHighlightedLines(workspaceLocation, 0, []));
    // most likely harmless, we can pretty much ignore this.
    // half of the time this comes from execution ending or a stack overflow and
    // the context goes missing.
  }
}

function* clearContext(workspaceLocation: WorkspaceLocation, entrypointCode: string) {
  const [chapter, symbols, externalLibraryName, globals, variant]: [
    number,
    string[],
    ExternalLibraryName,
    Array<[string, any]>,
    Variant
  ] = yield select((state: OverallState) => [
    state.workspaces[workspaceLocation].context.chapter,
    state.workspaces[workspaceLocation].context.externalSymbols,
    state.workspaces[workspaceLocation].externalLibrary,
    state.workspaces[workspaceLocation].globals,
    state.workspaces[workspaceLocation].context.variant
  ]);

  const library = {
    chapter,
    variant,
    external: {
      name: externalLibraryName,
      symbols
    },
    globals
  };

  // Clear the context, with the same chapter and externalSymbols as before.
  yield put(actions.beginClearContext(workspaceLocation, library, false));
  // Wait for the clearing to be done.
  yield take(END_CLEAR_CONTEXT);

  const context: Context = yield select(
    (state: OverallState) => state.workspaces[workspaceLocation].context
  );
  defineSymbol(context, '__PROGRAM__', entrypointCode);
}

export function* dumpDisplayBuffer(
  workspaceLocation: WorkspaceLocation
): Generator<StrictEffect, void, any> {
  yield put(actions.handleConsoleLog(workspaceLocation, ...DisplayBufferService.dump()));
}

/**
 * Inserts debugger statements into the code based off the breakpoints set by the user.
 *
 * For every breakpoint, a corresponding `debugger;` statement is inserted at the start
 * of the line that the breakpoint is placed at. The `debugger;` statement is available
 * in both JavaScript and Source, and invokes any available debugging functionality.
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger
 * for more information.
 *
 * While it is typically the case that statements are contained within a single line,
 * this is not necessarily true. For example, the code `const x = 3;` can be rewritten as:
 * ```
 * const x
 * = 3;
 * ```
 * A breakpoint on the line `= 3;` would thus result in a `debugger;` statement being
 * added in the middle of another statement. The resulting code would then be syntactically
 * invalid.
 *
 * To work around this issue, we parse the code to check for syntax errors whenever we
 * add a `debugger;` statement. If the addition of a `debugger;` statement results in
 * invalid code, an error message is outputted with the line number of the offending
 * breakpoint.
 *
 * @param workspaceLocation The location of the current workspace.
 * @param code              The code which debugger statements should be inserted into.
 * @param breakpoints       The breakpoints corresponding to the code.
 * @param context           The context in which the code should be evaluated in.
 */
function* insertDebuggerStatements(
  workspaceLocation: WorkspaceLocation,
  code: string,
  breakpoints: string[],
  context: Context
): Generator<StrictEffect, string, any> {
  // Check for initial syntax errors.
  if (isSourceLanguage(context.chapter)) {
    parse(code, context);
  }

  // If there are syntax errors, we do not insert the debugger statements.
  // Instead, we let the code be evaluated so that the error messages are printed.
  if (context.errors.length > 0) {
    context.errors = [];
    return code;
  }

  // Otherwise, we step through the breakpoints one by one & try to insert
  // corresponding debugger statements.
  const lines = code.split('\n');
  let transformedCode = code;
  for (let i = 0; i < breakpoints.length; i++) {
    if (!breakpoints[i]) continue;
    lines[i] = 'debugger;' + lines[i];
    // Reconstruct the code & check that the code is still syntactically valid.
    // The insertion of the debugger statement is potentially invalid if it
    // happens within an existing statement (that is split across lines).
    transformedCode = lines.join('\n');
    if (isSourceLanguage(context.chapter)) {
      parse(transformedCode, context);
    }
    // If the resulting code is no longer syntactically valid, throw an error.
    if (context.errors.length > 0) {
      const errorMessage = `Hint: Misplaced breakpoint at line ${i + 1}.`;
      yield put(actions.sendReplInputToOutput(errorMessage, workspaceLocation));
      return code;
    }
  }

  /*
  Not sure how this works, but there were some issues with breakpoints
  I'm not sure why `in` is being used here, given that it's usually not
  the intended effect

  for (const breakpoint in breakpoints) {
    // Add a debugger statement to the line with the breakpoint.
    const breakpointLineNum: number = parseInt(breakpoint);
    lines[breakpointLineNum] = 'debugger;' + lines[breakpointLineNum];
    // Reconstruct the code & check that the code is still syntactically valid.
    // The insertion of the debugger statement is potentially invalid if it
    // happens within an existing statement (that is split across lines).
    transformedCode = lines.join('\n');
    if (isSourceLanguage(context.chapter)) {
      parse(transformedCode, context);
    }
    // If the resulting code is no longer syntactically valid, throw an error.
    if (context.errors.length > 0) {
      const errorMessage = `Hint: Misplaced breakpoint at line ${breakpointLineNum + 1}.`;
      yield put(actions.sendReplInputToOutput(errorMessage, workspaceLocation));
      return code;
    }
  }
  */

  // Finally, return the transformed code with debugger statements added.
  return transformedCode;
}

export function* evalEditor(
  workspaceLocation: WorkspaceLocation
): Generator<StrictEffect, void, any> {
  const [prepend, activeEditorTabIndex, editorTabs, execTime, isFolderModeEnabled, fileSystem]: [
    string,
    number | null,
    EditorTabState[],
    number,
    boolean,
    FSModule
  ] = yield select((state: OverallState) => [
    state.workspaces[workspaceLocation].programPrependValue,
    state.workspaces[workspaceLocation].activeEditorTabIndex,
    state.workspaces[workspaceLocation].editorTabs,
    state.workspaces[workspaceLocation].execTime,
    state.workspaces[workspaceLocation].isFolderModeEnabled,
    state.fileSystem.inBrowserFileSystem
  ]);

  if (activeEditorTabIndex === null) {
    throw new Error('Cannot evaluate program without an entrypoint file.');
  }

  const defaultFilePath = `${WORKSPACE_BASE_PATHS[workspaceLocation]}/program.js`;
  let files: Record<string, string>;
  if (isFolderModeEnabled) {
    files = yield call(retrieveFilesInWorkspaceAsRecord, workspaceLocation, fileSystem);
  } else {
    files = {
      [defaultFilePath]: editorTabs[activeEditorTabIndex].value
    };
  }
  const entrypointFilePath = editorTabs[activeEditorTabIndex].filePath ?? defaultFilePath;

  // End any code that is running right now.
  yield put(actions.beginInterruptExecution(workspaceLocation));
  const entrypointCode = files[entrypointFilePath];
  yield* clearContext(workspaceLocation, entrypointCode);
  yield put(actions.clearReplOutput(workspaceLocation));
  const context = yield select(
    (state: OverallState) => state.workspaces[workspaceLocation].context
  );

  // Insert debugger statements at the lines of the program with a breakpoint.
  for (const editorTab of editorTabs) {
    const filePath = editorTab.filePath ?? defaultFilePath;
    const code = editorTab.value;
    const breakpoints = editorTab.breakpoints;
    files[filePath] = yield* insertDebuggerStatements(
      workspaceLocation,
      code,
      breakpoints,
      context
    );
  }

  // Evaluate the prepend silently with a privileged context, if it exists
  if (prepend.length) {
    const elevatedContext = makeElevatedContext(context);
    const prependFilePath = '/prepend.js';
    const prependFiles = {
      [prependFilePath]: prepend
    };
    yield call(
      evalCode,
      prependFiles,
      prependFilePath,
      elevatedContext,
      execTime,
      workspaceLocation,
      EVAL_SILENT
    );
    // Block use of methods from privileged context
    yield* blockExtraMethods(elevatedContext, context, execTime, workspaceLocation);
  }

  yield call(
    evalCode,
    files,
    entrypointFilePath,
    context,
    execTime,
    workspaceLocation,
    EVAL_EDITOR
  );
}

export function* blockExtraMethods(
  elevatedContext: Context,
  context: Context,
  execTime: number,
  workspaceLocation: WorkspaceLocation,
  unblockKey?: string
) {
  // Extract additional methods available in the elevated context relative to the context
  const toBeBlocked = getDifferenceInMethods(elevatedContext, context);
  if (unblockKey) {
    const storeValues = getStoreExtraMethodsString(toBeBlocked, unblockKey);
    const storeValuesFilePath = '/storeValues.js';
    const storeValuesFiles = {
      [storeValuesFilePath]: storeValues
    };
    yield call(
      evalCode,
      storeValuesFiles,
      storeValuesFilePath,
      elevatedContext,
      execTime,
      workspaceLocation,
      EVAL_SILENT
    );
  }

  const nullifier = getBlockExtraMethodsString(toBeBlocked);
  const nullifierFilePath = '/nullifier.js';
  const nullifierFiles = {
    [nullifierFilePath]: nullifier
  };
  yield call(
    evalCode,
    nullifierFiles,
    nullifierFilePath,
    elevatedContext,
    execTime,
    workspaceLocation,
    EVAL_SILENT
  );
}

export function* restoreExtraMethods(
  elevatedContext: Context,
  context: Context,
  execTime: number,
  workspaceLocation: WorkspaceLocation,
  unblockKey: string
) {
  const toUnblock = getDifferenceInMethods(elevatedContext, context);
  const restorer = getRestoreExtraMethodsString(toUnblock, unblockKey);
  const restorerFilePath = '/restorer.js';
  const restorerFiles = {
    [restorerFilePath]: restorer
  };
  yield call(
    evalCode,
    restorerFiles,
    restorerFilePath,
    elevatedContext,
    execTime,
    workspaceLocation,
    EVAL_SILENT
  );
}

export function* evalCode(
  files: Record<string, string>,
  entrypointFilePath: string,
  context: Context,
  execTime: number,
  workspaceLocation: WorkspaceLocation,
  actionType: string
): SagaIterator {
  context.runtime.debuggerOn =
    (actionType === EVAL_EDITOR || actionType === DEBUG_RESUME) && context.chapter > 2;

  // Logic for execution of substitution model visualizer
  const correctWorkspace = workspaceLocation === 'playground';
  const substIsActive: boolean = correctWorkspace
    ? yield select((state: OverallState) => state.workspaces[workspaceLocation].usingSubst)
    : false;
  const stepLimit: number = yield select(
    (state: OverallState) => state.workspaces[workspaceLocation].stepLimit
  );
  const substActiveAndCorrectChapter = context.chapter <= 2 && substIsActive;
  if (substActiveAndCorrectChapter) {
    context.executionMethod = 'interpreter';
  }

  const needUpdateCse: boolean = correctWorkspace
    ? yield select((state: OverallState) => state.workspaces[workspaceLocation].updateCse)
    : false;
  // When currentStep is -1, the entire code is run from the start.
  const currentStep: number = needUpdateCse
    ? -1
    : correctWorkspace
    ? yield select((state: OverallState) => state.workspaces[workspaceLocation].currentStep)
    : -1;

  const isFolderModeEnabled: boolean = yield select(
    (state: OverallState) => state.workspaces[workspaceLocation].isFolderModeEnabled
  );

  const entrypointCode = files[entrypointFilePath];

  // Handles `console.log` statements in fullJS
  const detachConsole: () => void =
    context.chapter === Chapter.FULL_JS
      ? DisplayBufferService.attachConsole(workspaceLocation)
      : () => {};

  const { result, interrupted, paused } = yield race({
    result:
      actionType === DEBUG_RESUME
        ? call(resume, lastDebuggerResult)
        : call(
            runFilesInContext,
            isFolderModeEnabled
              ? files
              : {
                  [entrypointFilePath]: files[entrypointFilePath]
                },
            entrypointFilePath,
            context,
            {
              scheduler: 'preemptive',
              originalMaxExecTime: execTime,
              stepLimit: stepLimit,
              throwInfiniteLoops: true,
              useSubst: substActiveAndCorrectChapter,
              envSteps: currentStep
            }
          ),

    /**
     * A BEGIN_INTERRUPT_EXECUTION signals the beginning of an interruption,
     * i.e the trigger for the interpreter to interrupt execution.
     */
    interrupted: take(BEGIN_INTERRUPT_EXECUTION),
    paused: take(BEGIN_DEBUG_PAUSE)
  });

  detachConsole();

  if (interrupted) {
    interrupt(context);
    /* Redundancy, added ensure that interruption results in an error. */
    context.errors.push(new InterruptedError(context.runtime.nodes[0]));
    yield put(actions.debuggerReset(workspaceLocation));
    yield put(actions.endInterruptExecution(workspaceLocation));
    yield call(showWarningMessage, 'Execution aborted', 750);
    return;
  }

  if (paused) {
    yield put(actions.endDebuggerPause(workspaceLocation));
    lastDebuggerResult = manualToggleDebugger(context);
    yield call(updateInspector, workspaceLocation);
    yield call(showWarningMessage, 'Execution paused', 750);
    return;
  }

  if (actionType === EVAL_EDITOR) {
    lastDebuggerResult = result;
  }

  if (
    result.status !== 'suspended' &&
    result.status !== 'finished' &&
    result.status !== 'suspended-non-det' &&
    result.status !== 'suspended-cse-eval'
  ) {
    yield* dumpDisplayBuffer(workspaceLocation);
    yield put(actions.evalInterpreterError(context.errors, workspaceLocation));

    return;
  } else if (result.status === 'suspended' || result.status === 'suspended-cse-eval') {
    yield put(actions.endDebuggerPause(workspaceLocation));
    yield put(actions.evalInterpreterSuccess('Breakpoint hit!', workspaceLocation));
    return;
  }

  yield* dumpDisplayBuffer(workspaceLocation);

  // Do not write interpreter output to REPL, if executing chunks (e.g. prepend/postpend blocks)
  if (actionType !== EVAL_SILENT) {
    yield put(actions.evalInterpreterSuccess(result.value, workspaceLocation));
  }

  // For EVAL_EDITOR and EVAL_REPL, we send notification to workspace that a program has been evaluated
  if (actionType === EVAL_EDITOR || actionType === EVAL_REPL || actionType === DEBUG_RESUME) {
    yield put(
      notifyProgramEvaluated(result, lastDebuggerResult, entrypointCode, context, workspaceLocation)
    );
  }
}