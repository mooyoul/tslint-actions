"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var core = require("@actions/core"); // tslint:disable-line
// Currently @actions/github cannot be loaded via import statement due to typing error
var github = require("@actions/github"); // tslint:disable-line
var fs = require("fs");
var glob = require("glob");
var path = require("path");
var tslint_1 = require("tslint");
var CHECK_NAME = "TSLint Checks";
var SeverityAnnotationLevelMap = new Map([
    ["warning", "warning"],
    ["error", "failure"],
]);
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var ctx, configFileName, projectFileName, pattern, ghToken, octokit, check, options, result, annotations;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ctx = github.context;
                configFileName = core.getInput("config") || "tslint.json";
                projectFileName = core.getInput("project");
                pattern = core.getInput("pattern");
                ghToken = core.getInput("token");
                if (!projectFileName && !pattern) {
                    core.setFailed("tslint-actions: Please set project or pattern input");
                    return [2 /*return*/];
                }
                if (!ghToken) {
                    core.setFailed("tslint-actions: Please set token");
                    return [2 /*return*/];
                }
                octokit = new github.GitHub(ghToken);
                return [4 /*yield*/, octokit.checks.create({
                        owner: ctx.repo.owner,
                        repo: ctx.repo.repo,
                        name: CHECK_NAME,
                        head_sha: ctx.sha,
                        status: "in_progress"
                    })];
            case 1:
                check = _a.sent();
                options = {
                    fix: false,
                    formatter: "json"
                };
                result = (function () {
                    if (projectFileName && !pattern) {
                        var projectDir = path.dirname(path.resolve(projectFileName));
                        var program = tslint_1.Linter.createProgram(projectFileName, projectDir);
                        var linter = new tslint_1.Linter(options, program);
                        var files = tslint_1.Linter.getFileNames(program);
                        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                            var file = files_1[_i];
                            var sourceFile = program.getSourceFile(file);
                            if (sourceFile) {
                                var fileContents = sourceFile.getFullText();
                                var configuration = tslint_1.Configuration.findConfiguration(configFileName, file).results;
                                linter.lint(file, fileContents, configuration);
                            }
                        }
                        return linter.getResult();
                    }
                    else {
                        var linter = new tslint_1.Linter(options);
                        var files = glob.sync(pattern);
                        for (var _a = 0, files_2 = files; _a < files_2.length; _a++) {
                            var file = files_2[_a];
                            var fileContents = fs.readFileSync(file, { encoding: "utf8" });
                            var configuration = tslint_1.Configuration.findConfiguration(configFileName, file).results;
                            linter.lint(file, fileContents, configuration);
                        }
                        return linter.getResult();
                    }
                })();
                annotations = result.failures.map(function (failure) { return ({
                    path: failure.getFileName(),
                    start_line: failure.getStartPosition().getLineAndCharacter().line,
                    end_line: failure.getEndPosition().getLineAndCharacter().line,
                    annotation_level: SeverityAnnotationLevelMap.get(failure.getRuleSeverity()) || "notice",
                    message: failure.getRuleName() + " " + failure.getFailure()
                }); });
                // Update check
                return [4 /*yield*/, octokit.checks.update({
                        owner: ctx.repo.owner,
                        repo: ctx.repo.repo,
                        check_run_id: check.data.id,
                        name: CHECK_NAME,
                        status: "completed",
                        conclusion: result.errorCount > 0 ? "failure" : "success",
                        output: {
                            title: CHECK_NAME,
                            summary: result.errorCount + " error(s), " + result.warningCount + " warning(s) found",
                            annotations: annotations
                        }
                    })];
            case 2:
                // Update check
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })()["catch"](function (e) {
    console.error(e.stack); // tslint:disable-line
    core.setFailed(e.message);
});
