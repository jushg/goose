
import { compile } from ".";
import { parse } from "../parser";

describe("Declare Statement only", () => {
    it("should compile empty function", () => {
        const testProgram =     parse(`

        func main() {
         
        }  
          
          `)

        let pf = compile(testProgram);

       expect(pf.instructions.length).toEqual(4)
       expect(pf.topLevelDecl[0]).toEqual(0)
       expect(pf.topLevelDecl.length).toEqual(1)

    })

    it("should compile multiple empty function", ()=> {
      const testProgram =     parse(`

        func main() {
         
        }  

        func x()  {
      
        }
          
          `)

        let pf = compile(testProgram);

       expect(pf.topLevelDecl.length).toEqual(2)
    }),

    it("should compile multiple function", ()=> {
      const testProgram =     parse(`

        func main() {
         
        }  

        func x() int {
          return 1
        }
          
          `)

        let pf = compile(testProgram);

       expect(pf.topLevelDecl.length).toEqual(2)
    })

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
