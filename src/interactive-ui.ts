import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import { BugReport } from './schema';

export class InteractiveReporter {
    async reviewAndFix(issues: BugReport['issues'], filePath: string) {
        if (issues.length === 0) return;

        console.log(chalk.bold.underline(`\nReviewing ${issues.length} issues in ${filePath}`));

        const content = fs.readFileSync(filePath, 'utf-8');
        let currentContent = content;
        let modified = false;

        for (const issue of issues) {
            console.log(chalk.red(`\n[${issue.type.toUpperCase()}] ${issue.severity}`));
            console.log(chalk.white(issue.description));
            console.log(chalk.gray(`Line: ${issue.line}`));

            if (!issue.fix) {
                console.log(chalk.yellow('No auto-fix available.'));
                continue;
            }

            console.log(chalk.cyan('Proposed Fix:'));
            console.log(chalk.red(`- ${issue.fix.original.trim()}`));
            console.log(chalk.green(`+ ${issue.fix.replacement.trim()}`));

            const answer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Apply this fix?',
                    choices: [
                        { name: 'Apply Fix', value: 'apply' },
                        { name: 'Skip', value: 'skip' }
                    ]
                }
            ]);

            if (answer.action === 'apply') {
                // Determine if original content still matches
                if (currentContent.includes(issue.fix.original)) {
                    currentContent = currentContent.replace(issue.fix.original, issue.fix.replacement);
                    console.log(chalk.green('Fix applied (in memory).'));
                    modified = true;
                } else {
                    console.log(chalk.red('Error: Could not apply fix. File content may have changed or "original" logic did not match.'));
                }
            } else {
                // User skipped. Ask why.
                const feedback = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'reason',
                        message: 'Why did you skip?',
                        choices: [
                            { name: 'Just skipping for now', value: 'skip' },
                            { name: 'False Positive (Don\'t show again)', value: 'false_positive' },
                            { name: 'Bad Fix (The fix is wrong)', value: 'bad_fix' }
                        ]
                    }
                ]);

                if (feedback.reason === 'false_positive') {
                    // We need line content for robust hashing. 
                    // Simple approximation: read the specific line from file.
                    const lines = currentContent.split('\n');
                    const lineContent = lines[issue.line - 1] || '';

                    const { MemoryManager } = await import('./memory');
                    const memory = new MemoryManager();
                    memory.addFalsePositive(filePath, issue.description, lineContent);
                    console.log(chalk.gray('Marked as false positive. I will learn from this.'));
                } else if (feedback.reason === 'bad_fix') {
                    const critique = await inquirer.prompt([{
                        type: 'input',
                        name: 'pref',
                        message: 'Any tip for next time? (e.g. "Prefer const")'
                    }]);
                    if (critique.pref) {
                        const { MemoryManager } = await import('./memory');
                        const memory = new MemoryManager();
                        memory.addPreference(critique.pref);
                        console.log(chalk.gray('Preference saved.'));
                    }
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, currentContent);
            console.log(chalk.green(`\nSaved changes to ${filePath}`));
        }
    }
}
