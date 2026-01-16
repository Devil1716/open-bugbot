#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const llm_client_1 = require("./llm-client");
const program = new commander_1.Command();
program
    .name('open-bugbot')
    .description('Open Source AI Code Reviewer')
    .version('0.1.0');
program
    .command('scan <file>')
    .description('Scan a single file for bugs using local LLM')
    .option('-m, --model <string>', 'Model to use (default: mistral)', 'mistral')
    .option('--url <string>', 'LLM Base URL', 'http://localhost:11434/v1')
    .action(async (filePath, options) => {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(chalk_1.default.red(`Error: File not found: ${absolutePath}`));
        process.exit(1);
    }
    console.log(chalk_1.default.blue(`Reading file: ${filePath}...`));
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    console.log(chalk_1.default.blue(`Initializing Local LLM (${options.model}) at ${options.url}...`));
    const llm = new llm_client_1.LocalLLMClient({
        baseUrl: options.url,
        model: options.model
    });
    console.log(chalk_1.default.yellow('Analyzing... (this may take a moment)'));
    const analysis = await llm.analyzeCode(fileContent, filePath);
    console.log(chalk_1.default.green('\n--- Analysis Result ---\n'));
    console.log(analysis);
    console.log(chalk_1.default.green('\n-----------------------\n'));
});
program
    .command('diff')
    .description('Analyze unstaged changes (or specific target) using git diff')
    .option('-t, --target <string>', 'Git diff target (default: HEAD)', 'HEAD')
    .option('-m, --model <string>', 'Model to use', 'mistral')
    .option('--url <string>', 'LLM Base URL', 'http://localhost:11434/v1')
    .option('--ci', 'Run in CI mode (posts comments to GitHub)')
    .option('--commit <string>', 'Commit ID to comment on (required for --ci)')
    .action(async (options) => {
    try {
        const { loadConfig } = await Promise.resolve().then(() => __importStar(require('./config')));
        const config = loadConfig();
        // Merge config with options (flags take precedence)
        const model = options.model !== 'mistral' ? options.model : (config.model || 'mistral');
        const baseUrl = options.url !== 'http://localhost:11434/v1' ? options.url : (config.baseUrl || 'http://localhost:11434/v1');
        console.log(chalk_1.default.blue('Fetching git diff...'));
        const { getGitDiff } = await Promise.resolve().then(() => __importStar(require('./git')));
        const diffOutput = await getGitDiff(options.target);
        if (!diffOutput.trim()) {
            console.log(chalk_1.default.yellow('No changes detected.'));
            return;
        }
        const { parseGitDiff } = await Promise.resolve().then(() => __importStar(require('./diff-parser')));
        const files = parseGitDiff(diffOutput);
        console.log(chalk_1.default.blue(`Found ${files.length} changed files.`));
        const llm = new llm_client_1.LocalLLMClient({
            baseUrl: baseUrl,
            model: model,
            apiKey: process.env.OPENAI_API_KEY // Ensure env var is passed if config misses it
        });
        const { AiEngine } = await Promise.resolve().then(() => __importStar(require('./ai-engine')));
        const aiEngine = new AiEngine(llm, config.systemPrompt);
        // Initialize GitHub Client if in CI mode
        let githubClient;
        if (options.ci) {
            const token = process.env.GITHUB_TOKEN;
            if (!token) {
                throw new Error('GITHUB_TOKEN is required for --ci mode');
            }
            const { GitHubClient } = await Promise.resolve().then(() => __importStar(require('./github-client')));
            githubClient = new GitHubClient(token);
            console.log(chalk_1.default.blue('GitHub integration enabled.'));
        }
        for (const file of files) {
            console.log(chalk_1.default.yellow(`Analyzing changes in ${file.to}...`));
            const context = file.chunks.join('\n\n');
            const report = await aiEngine.analyzeDiff(context, file.to);
            if (report.issues.length === 0) {
                console.log(chalk_1.default.green(`✓ No issues found in ${file.to}`));
                continue;
            }
            console.log(chalk_1.default.red(`\nFound ${report.issues.length} issues in ${file.to}:`));
            for (const [index, issue] of report.issues.entries()) {
                const color = issue.severity === 'critical' || issue.severity === 'high' ? chalk_1.default.red : chalk_1.default.yellow;
                const logMsg = `\n[${index + 1}] ${issue.type.toUpperCase()} (${issue.severity})\nLine: ${issue.line}\n${issue.description}\nSuggestion: ${issue.suggestion}`;
                console.log(color(logMsg));
                if (options.ci && githubClient && options.commit) {
                    try {
                        const body = `**[${issue.type.toUpperCase()}]** ${issue.description}\n\nSuggested Fix:\n\`\`\`typescript\n${issue.suggestion}\n\`\`\``;
                        await githubClient.postReviewComment(file.to, issue.line, body, options.commit);
                    }
                    catch (e) {
                        console.error(chalk_1.default.red(`Failed to comment on GitHub: ${e.message}`));
                    }
                }
            }
            console.log('\n');
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error: ${error.message}`));
        process.exit(1);
    }
});
program.parse();
