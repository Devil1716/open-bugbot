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
    .action(async (options) => {
        try {
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
                baseUrl: options.url,
                model: options.model
            });

            for (const file of files) {
                console.log(chalk.yellow(`Analyzing changes in ${file.to}...`));

                const context = `
Diff Context for ${file.to}:
${file.chunks.join('\n\n')}
`;
                const analysis = await llm.analyzeCode(context, file.to);
                console.log(chalk.green(`\n--- Report for ${file.to} ---\n`));
                console.log(analysis);
                console.log(chalk.green('\n--------------------------\n'));
            }

        } catch (error: any) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

program.parse();
