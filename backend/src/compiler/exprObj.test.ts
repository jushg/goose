import { compile } from ".";
import { parse } from "../parser";

describe("compileExpr - Call Statement", () => {
  it("should compile call functions", () => {
    const testProgram = parse(`

        func x(y int, z int) int {
            return 1
        }

        func main() {
            y:= 5
            x(y,7)
        }  
          `);

    let pf = compile(testProgram);
  });
});
