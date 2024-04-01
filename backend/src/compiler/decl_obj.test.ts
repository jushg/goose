
import { compile } from ".";
import { parse } from "../parser";

describe("compileDecl - Declare Statement", () => {
    it("should compile empty function", () => {
        const testProgram =     parse(`

        func main() {
         
        }  
          
          `)

        let pf = compile(testProgram);

       expect(pf.instructions.length).toEqual(4)
       expect(pf.topLevelDecl[0]).toEqual(0)
    })

    it("should compile multiple empty function", ()=> {
      const testProgram =     parse(`

        func main() {
         
        }  

        func x() int {
          return 1
        }
          
          `)

        let pf = compile(testProgram);

       expect(pf.instructions.length).toEqual(4)
       expect(pf.topLevelDecl[0]).toEqual(0)
    })
});
