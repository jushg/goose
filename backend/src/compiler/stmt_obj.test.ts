
import { compile } from ".";
import { parse } from "../parser";
import { ProgramFile } from "./model";

describe("compileStmt - If Statement", () => {
    it("should compile an if statement", () => {
        // Create a mock IfStmtObj object
        const testProgram =     parse(`

        func main() {
          messages := make(chan string)
          x := 0
         
         
          go func() { messages <- "ping" }()
          msg := <-messages
          Println(msg)
        }  
          
          `)

        console.log(testProgram)


        // Call the compileStmt function with the if statement and the mock ProgramFile
        let pf = compile(testProgram);

        // Assert the expected behavior here
       console.log(pf)
    });
});
