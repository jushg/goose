import { Program } from './compiler'
import OpCodes from './opcodes'


// register that says if machine is running
// We cannot use DONE as multithreaded ENV may exit 
// without reaching 'DONE' like single threaded flow
let RUNNING = true 


// GLOBAL_ENV is the env that contains all the primitive functions
let GLOBAL_ENV = -1
// HEAP is array containing all dynamically allocated data structures
let HEAP: any[] = []
// next free slot in heap
let FREE = 0

// PC is program counter: index of the next instruction in P
let PC = 0
// ENV is address of current environment in HEAP; initially a dummy value
let ENV = -1

// OS is the operand stack
let OS: any[] = []

// RTS contains the call stack
let RTS: any[] = []

// Instruction array
const M: ((any) => void)[] = []

M[OpCodes.NOP] = instr => {
    PC = PC + 1
}

M[OpCodes.LDC] = instr => {
    // push(OS, JS_value_to_address(instr.val)),
}

M[OpCodes.UNOP] = instr => {
    // push(OS, apply_unop(instr.sym, OS.pop())),
}

M[OpCodes.BINOP] = instr => {
    // push(OS, 
    //      apply_binop(instr.sym, OS.pop(), OS.pop())),
}

M[OpCodes.POP] = instr => {
    // OS.pop()
}
M[OpCodes.JOF] = instr => {
    // PC = is_True(OS.pop()) ? PC : instr.addr,
}

M[OpCodes.GOTO] = instr => {
    // PC = instr.addr,
}

M[OpCodes.ENTER_SCOPE] = instr => {
        // push(RTS, heap_allocate_Blockframe(E))
        // const frame_address = heap_allocate_Frame(instr.num)
        // E = heap_Environment_extend(frame_address, E)
        // for (let i = 0; i < instr.num; i++) {
        //     heap_set_child(frame_address, i, Unassigned)
        // }
}
M[OpCodes.EXIT_SCOPE] = instr => {
    // E = heap_get_Blockframe_environment(RTS.pop()),
}
M[OpCodes.LD] = instr => {
    // const val = heap_get_Environment_value(E, instr.pos)
    // if (is_Unassigned(val)) 
    //     error("access of unassigned variable")
    // push(OS, val)
}
M[OpCodes.ASSIGN] = instr => {
    // heap_set_Environment_value(E, instr.pos, peek(OS,0))
}

M[OpCodes.LDF] = instr => {
    // const closure_address = 
    //           heap_allocate_Closure(
    //               instr.arity, instr.addr, E)
    // push(OS, closure_address)
}
M[OpCodes.CALL] = instr => {
    // const arity = instr.arity
    // const fun = peek(OS, arity)
    // if (is_Builtin(fun)) {
    //     return apply_builtin(heap_get_Builtin_id(fun))
    // }
    // const new_PC = heap_get_Closure_pc(fun)
    // const new_frame = heap_allocate_Frame(arity)
    // for (let i = arity - 1; i >= 0; i--) {
    //     heap_set_child(new_frame, i, OS.pop())
    // }
    // OS.pop() // pop fun
    // push(RTS, heap_allocate_Callframe(E, PC))
    // E = heap_Environment_extend(
    //         new_frame, 
    //         heap_get_Closure_environment(fun))
    // PC = new_PC
}

M[OpCodes.TAIL_CALL] = instr => {
    // const arity = instr.arity
    // const fun = peek(OS, arity)
    // if (is_Builtin(fun)) {
    //     return apply_builtin(heap_get_Builtin_id(fun))
    // }
    // const new_PC = heap_get_Closure_pc(fun)
    // const new_frame = heap_allocate_Frame(arity)
    // for (let i = arity - 1; i >= 0; i--) {
    //     heap_set_child(new_frame, i, OS.pop())
    // }
    // OS.pop() // pop fun
    // // don't push on RTS here
    // E = heap_Environment_extend(
    //         new_frame,
    //         heap_get_Closure_environment(fun))
    // PC = new_PC
}

M[OpCodes.RESET] = instr => {
    // // keep popping...
    // const top_frame = RTS.pop()
    // if (is_Callframe(top_frame)) {
    //     // ...until top frame is a call frame
    //     PC = heap_get_Callframe_pc(top_frame)
    //     E = heap_get_Callframe_environment(top_frame)
    // } else {
    // PC--
    // }    
}

// called whenever the machine is first run
function INITIALIZE() {
    PC = 0
}

function RUN_INSTRUCTION() {

}

function run() {
    const startTime = Date.now()
    const maxTimeDuration = 0 // TODO: Add

    INITIALIZE()

    while (RUNNING) {
        // infinite loop protection
        if (Date.now() - startTime > maxTimeDuration) {
            return;
            // throw new PotentialInfiniteLoopError(locationDummyNode(-1, -1, null), MAX_TIME)
        }

        RUN_INSTRUCTION()

    }

    // Clear up memory 
    // Handle panic
    // Handle recover

}


export function runWithProgram(program: Program) {
    PC = program[0]

    return run()
}



