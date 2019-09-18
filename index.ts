import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import { Linter, Configuration } from "tslint";

(async () => {
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);

  const configFileName = core.getInput("config") || "tslint.json";
  const projectFileName = core.getInput("project");
  const pattern = core.getInput("pattern");

  if (!projectFileName || !pattern) {
    core.setFailed("tslint-actions: Please set project or pattern input");
    return;
  }

  const projectDir = path.dirname(path.resolve(projectFileName));
  const typeCheckingEnabled = !!projectFileName;

  const options = {
    fix: false,
    formatter: "json",
  };

  // Create a new Linter instance
  const result = (() => {
    if (typeCheckingEnabled && !pattern) {
      const program = Linter.createProgram(projectFileName, projectDir);
      const linter = new Linter(options, program);

      const files = Linter.getFileNames(program);
      for (const file of files) {
        const sourceFile = program.getSourceFile(file);
        if (sourceFile) {
          const fileContents = sourceFile.getFullText();
          const configuration = Configuration.findConfiguration(configFileName, file).results;
          linter.lint(file, fileContents, configuration);
        }
      }

      return linter.getResult();
    } else {
      const linter = new Linter(options);

      const files = glob.sync(pattern);
      for (const file of files) {
        const fileContents = fs.readFileSync(file, { encoding: "utf8" });
        const configuration = Configuration.findConfiguration(configFileName, file).results;
        linter.lint(file, fileContents, configuration);
      }

      return linter.getResult();
    }
  })();

  console.log("results: ", result);
})().catch((e) => {
  console.error(e.message);
  core.setFailed(e.message);
});
