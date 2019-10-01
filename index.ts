import * as core from "@actions/core"; // tslint:disable-line
// Currently @actions/github cannot be loaded via import statement due to typing error
const github = require("@actions/github"); // tslint:disable-line
import { Context } from "@actions/github/lib/context";
import * as Octokit from "@octokit/rest";
import { stripIndent as markdown } from "common-tags";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import { Configuration, Linter, RuleSeverity } from "tslint";

const CHECK_NAME = "TSLint Checks";

const SeverityAnnotationLevelMap = new Map<RuleSeverity, "warning" | "failure">([
  ["warning", "warning"],
  ["error", "failure"],
]);

(async () => {
  const ctx = github.context as Context;

  const configFileName = core.getInput("config") || "tslint.json";
  const projectFileName = core.getInput("project");
  const pattern = core.getInput("pattern");
  const ghToken = core.getInput("token");
  const onlyChanged = core.getInput("only-changed") || false;

  if (!projectFileName && !pattern) {
    core.setFailed("tslint-actions: Please set project or pattern input");
    return;
  }

  if (!ghToken) {
    core.setFailed("tslint-actions: Please set token");
    return;
  }

  const octokit = new github.GitHub(ghToken) as Octokit;

  // Create check
  const check = await octokit.checks.create({
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
    name: CHECK_NAME,
    head_sha: ctx.payload.pull_request ? ctx.payload.pull_request.head.sha : ctx.sha,
    status: "in_progress",
  });

  const options = {
    fix: false,
    formatter: "json",
  };

  // Create a new Linter instance
  const result = await (async () => {
    if (projectFileName && !pattern) {
      const projectDir = path.dirname(path.resolve(projectFileName));
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

      let files = glob.sync(pattern!);
      if (onlyChanged) {
        const pullRequest = ctx.payload.pull_request;
        if (pullRequest) {
          const response = await octokit.pulls.listFiles({
            owner: ctx.repo.owner,
            repo: ctx.repo.repo,
            pull_number: pullRequest.number,
          });
          const changedFiles = response.data.map((f) => f.filename);
          files = files.filter((f: string) => changedFiles.includes(f));
        } else {
          const response = await octokit.repos.getCommit({
            owner: ctx.repo.owner,
            repo: ctx.repo.repo,
            ref: ctx.sha,
          })
          const changedFiles = response.data.files.map((f) => f.filename);
          files = files.filter((f: string) => changedFiles.includes(f));
        }
      }
      for (const file of files) {
        const fileContents = fs.readFileSync(file, { encoding: "utf8" });
        const configuration = Configuration.findConfiguration(configFileName, file).results;
        linter.lint(file, fileContents, configuration);
      }

      return linter.getResult();
    }
  })();

  const annotations: Octokit.ChecksCreateParamsOutputAnnotations[] = result.failures.map((failure) => ({
    path: failure.getFileName(),
    start_line: failure.getStartPosition().getLineAndCharacter().line,
    end_line: failure.getEndPosition().getLineAndCharacter().line,
    start_column: failure.getStartPosition().getLineAndCharacter().character,
    end_column: failure.getStartPosition().getLineAndCharacter().character,
    annotation_level: SeverityAnnotationLevelMap.get(failure.getRuleSeverity()) || "notice",
    message: `[${failure.getRuleName()}] ${failure.getFailure()}`,
  }));

  // Update check
  await octokit.checks.update({
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
    check_run_id: check.data.id,
    name: CHECK_NAME,
    status: "completed",
    conclusion: result.errorCount > 0 ? "failure" : "success",
    output: {
      title: CHECK_NAME,
      summary: `${result.errorCount} error(s), ${result.warningCount} warning(s) found`,
      text: markdown`
        ## Configuration

        #### Actions Input

        | Name | Value |
        | ---- | ----- |
        | config | \`${configFileName}\` |
        | project | \`${projectFileName || "(not provided)"}\` |
        | pattern | \`${pattern || "(not provided)"}\` |

        #### TSLint Configuration

        \`\`\`json
        __CONFIG_CONTENT__
        \`\`\`
        </details>
      `.replace("__CONFIG_CONTENT__", JSON.stringify(Configuration.readConfigurationFile(configFileName), null, 2)),
      annotations,
    },
  });

  if (result.errorCount) {
    core.setFailed(`${result.errorCount} error(s), ${result.warningCount} warning(s) found`);
  }
})().catch((e) => {
  console.error(e.stack); // tslint:disable-line
  core.setFailed(e.message);
});
