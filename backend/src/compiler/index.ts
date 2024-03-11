import { StmtObj } from '../parser';

// Dummy function, just for testing.
export function compile(s: StmtObj) {
    switch (s.stmtType) {
        case 'EXPR':
        case 'SEND':
        case 'INC':
        case 'DEC':
        case 'ASSIGN':
        case 'IF':
        case 'SWITCH':
        case 'SELECT':
        case 'FOR':
        case 'BREAK':
        case 'CONTINUE':
        case 'GOTO':
        case 'FALLTHROUGH':
        case 'DEFER':
        case 'GO':
        case 'RETURN':
            return 1
    }
}