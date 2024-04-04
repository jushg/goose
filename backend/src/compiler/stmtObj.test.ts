import { compile } from ".";
import { parse } from "../parser";

describe("compileStmt - If stmt", () => {
  it("should compile if functions without else", () => {
    const testProgram = parse(`

        func main() {
            if x:= 3; x < 5 {

            }
        }  
  
          `);

    let pf = compile(testProgram);
    // expect(pf.topLevelDecl.length).toEqual(1);
  }),
    it("should compile if functions with else", () => {
      const testProgram = parse(`
  
          func main() {
              if x:= 3; x < 5 {
  
              } else {

              }
          }  
    
            `);

      let pf = compile(testProgram);

      // expect(pf.topLevelDecl.length).toEqual(1);
    }),
    it("should compile if functions with else if", () => {
      const testProgram = parse(`
  
          func main() {
              if x:= 3; x < 5 {

              } else if y := 5; y < 3 {

              } else {

              }
          }  
    
            `);

      let pf = compile(testProgram);

      // expect(pf.topLevelDecl.length).toEqual(1);
    });
});

describe("compileStmt - For stmt", () => {
  it("should compile For functions without cond", () => {
    const testProgram = parse(`

        func main() {
            for {
                x:= 3
            }
        }  
  
          `);

    let pf = compile(testProgram);

    // expect(pf.topLevelDecl.length).toEqual(1);
  }),
    it("should compile for functions with cond and pre", () => {
      const testProgram = parse(`
  
        func main() {
            sum := 0
            for i := 0; i < 10; i++ {
                sum = sum + i
            }
        }
    
            `);

      let pf = compile(testProgram);

      // expect(pf.topLevelDecl.length).toEqual(1);
    });
});

describe("Declare Statement only", () => {
  it("should compile empty function", () => {
    const testProgram = parse(`

      func main() {
       
      }  
        
        `);

    let pf = compile(testProgram);

    // expect(pf.instructions.length).toEqual(4);
    // expect(pf.topLevelDecl[0]).toEqual(0);
    // expect(pf.topLevelDecl.length).toEqual(1);
  });

  it("should compile multiple empty function", () => {
    const testProgram = parse(`

      func main() {
       
      }  

      func x()  {
    
      }
        
        `);

    let pf = compile(testProgram);

    // expect(pf.topLevelDecl.length).toEqual(2);
  }),
    it("should compile multiple function", () => {
      const testProgram = parse(`

      func main() {
       
      }  

      func x() int {
        return 1
      }
        
        `);

      let pf = compile(testProgram);

      // expect(pf.topLevelDecl.length).toEqual(2);
    });

  // Test case to check type, should fail

  // it("should compile multiple empty function", ()=> {
  //   const testProgram =     parse(`

  //     func main() {

  //     }

  //     func x() int {
  //       return "one"
  //     }

  //     func

  //       `)

  //     let pf = compile(testProgram);

  //    expect(pf.instructions.length).toEqual(4)
  //    expect(pf.topLevelDecl[0]).toEqual(0)
  // }),
});
