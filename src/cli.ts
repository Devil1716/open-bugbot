#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { LocalLLMClient } from './llm-client';

const program = new Command();

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
            console.error(chalk.red(`Error: File not found: ${absolutePath}`));
            process.exit(1);
        }

        console.log(chalk.blue(`Reading file: ${filePath}...`));
        const fileContent = fs.readFileSync(absolutePath, 'utf-8');

        console.log(chalk.blue(`Initializing Local LLM (${options.model}) at ${options.url}...`));
        const llm = new LocalLLMClient({
            baseUrl: options.url,
            model: options.model
        });

        console.log(chalk.yellow('Analyzing... (this may take a moment)'));
        const analysis = await llm.analyzeCode(fileContent, filePath);

        console.log(chalk.green('\n--- Analysis Result ---\n'));
        console.log(analysis);
        console.log(chalk.green('\n-----------------------\n'));
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
            const { loadConfig } = await import('./config');
            const config = loadConfig();

            // Merge config with options (flags take precedence)
            const model = options.model !== 'mistral' ? options.model : (config.model || 'mistral');
            const baseUrl = options.url !== 'http://localhost:11434/v1' ? options.url : (config.baseUrl || 'http://localhost:11434/v1');

            console.log(chalk.blue('Fetching git diff...'));
            const { getGitDiff } = await import('./git');
            const diffOutput = await getGitDiff(options.target);

            if (!diffOutput.trim()) {
                console.log(chalk.yellow('No changes detected.'));
                return;
            }

            const { parseGitDiff } = await import('./diff-parser');
            const files = parseGitDiff(diffOutput);
            console.log(chalk.blue(`Found ${files.length} changed files.`));

            const llm = new LocalLLMClient({
                baseUrl: baseUrl,
                model: model,
                apiKey: process.env.OPENAI_API_KEY // Ensure env var is passed if config misses it
            });

            const { AiEngine } = await import('./ai-engine');
            const aiEngine = new AiEngine(llm, config.systemPrompt);

            // Initialize GitHub Client if in CI mode
            let githubClient;
            if (options.ci) {
                const token = process.env.GITHUB_TOKEN;
                if (!token) {
                    throw new Error('GITHUB_TOKEN is required for --ci mode');
                }
                const { GitHubClient } = await import('./github-client');
                githubClient = new GitHubClient(token);
                console.log(chalk.blue('GitHub integration enabled.'));
            }

            for (const file of files) {
                console.log(chalk.yellow(`Analyzing changes in ${file.to}...`));

                const context = file.chunks.join('\n\n');
                const report = await aiEngine.analyzeDiff(context, file.to);

                if (report.issues.length === 0) {
                    console.log(chalk.green(`✓ No issues found in ${file.to}`));
                    continue;
                }

                console.log(chalk.red(`\nFound ${report.issues.length} issues in ${file.to}:`));

                for (const [index, issue] of report.issues.entries()) {
                    const color = issue.severity === 'critical' || issue.severity === 'high' ? chalk.red : chalk.yellow;
                    const logMsg = `\n[${index + 1}] ${issue.type.toUpperCase()} (${issue.severity})\nLine: ${issue.line}\n${issue.description}\nSuggestion: ${issue.suggestion}`;
                    console.log(color(logMsg));

                    if (options.ci && githubClient && options.commit) {
                        try {
                            const body = `**[${issue.type.toUpperCase()}]** ${issue.description}\n\nSuggested Fix:\n\`\`\`typescript\n${issue.suggestion}\n\`\`\``;
                            await githubClient.postReviewComment(file.to, issue.line, body, options.commit);
                        } catch (e: any) {
                            console.error(chalk.red(`Failed to comment on GitHub: ${e.message}`));
                        }
                    }
                }
                console.log('\n');
            }

        } catch (error: any) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });


program
    .command('init')
    .description('Generate a default configuration file')
    .action(() => {
        const configPath = path.resolve('bugbot.config.json');
        if (fs.existsSync(configPath)) {
            console.log(chalk.yellow('Config file already exists: bugbot.config.json'));
            return;
        }

        const defaultConfig = {
            model: "mistral",
            baseUrl: "http://localhost:11434/v1",
            systemPrompt: "You are an expert code reviewer. Focus on security, performance, and best practices."
        };

        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(chalk.green('✓ Created bugbot.config.json'));
    });

program
    .command('fix <file>')
    .description('Interactively fix bugs in a specific file')
    .option('-m, --model <string>', 'Model to use', 'mistral')
    .option('--url <string>', 'LLM Base URL', 'http://localhost:11434/v1')
    .action(async (filePath, options) => {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            console.error(chalk.red(`Error: File not found: ${absolutePath}`));
            process.exit(1);
        }

        const { loadConfig } = await import('./config');
        const config = loadConfig();
        // Merge config
        const model = options.model !== 'mistral' ? options.model : (config.model || 'mistral');
        const baseUrl = options.url !== 'http://localhost:11434/v1' ? options.url : (config.baseUrl || 'http://localhost:11434/v1');

        console.log(chalk.blue(`Reading file: ${filePath}...`));
        const fileContent = fs.readFileSync(absolutePath, 'utf-8');

        const llm = new LocalLLMClient({
            baseUrl: baseUrl,
            model: model,
            apiKey: process.env.OPENAI_API_KEY
        });

        const fakeDiff = `diff --git a/${filePath} b/${filePath}\nindex 0000000..1111111\n--- /dev/null\n+++ b/${filePath}\n@@ -1,${fileContent.split('\n').length} +1,${fileContent.split('\n').length} @@\n${fileContent.split('\n').map(l => '+' + l).join('\n')}`;

        const { AiEngine } = await import('./ai-engine');
        const aiEngine = new AiEngine(llm, config.systemPrompt);

        console.log(chalk.yellow('Analyzing for fixes...'));
        const report = await aiEngine.analyzeDiff(fakeDiff, filePath);

        if (report.issues.length === 0) {
            console.log(chalk.green('No issues found needing fixes.'));
            return;
        }

        const { InteractiveReporter } = await import('./interactive-ui');
        const reporter = new InteractiveReporter();
        await reporter.reviewAndFix(report.issues, absolutePath);
    });

program.parse();
