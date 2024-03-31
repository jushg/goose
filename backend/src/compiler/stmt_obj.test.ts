
import { compile } from ".";
import { parse } from "../parser";

describe("compileStmt - If Statement", () => {
    it("should compile an if statement", () => {
        // Create a mock IfStmtObj object
        const testProgram =     parse(`

        func main() {
          x := 0
         
         

        }  
          
          `)

        console.log(testProgram)


        // Call the compileStmt function with the if statement and the mock ProgramFile
        let pf = compile(testProgram);

        // Assert the expected behavior here
       console.log(pf)
    });
});
