"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitDiff = getGitDiff;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function getGitDiff(target = 'HEAD') {
    try {
        // Diff between target (e.g. main) and current working, or just untracked?
        // Bugbot usually checks the *Changes* in this PR/Branch vs Main.
        // For local usage, 'git diff main...HEAD' is common to see changes on current branch.
        // Or just 'git diff' for unstaged changes.
        // Let's support a flexible target. 
        // If target is provided, diff against it. Default to 'HEAD' (staged changes?). 
        // Actually, for local dev loop, usually we want 'git diff' (uncommitted) or 'git diff HEAD~1' (last commit).
        // Command: git diff <target>
        const { stdout } = await execAsync(`git diff ${target}`);
        return stdout;
    }
    catch (error) {
        throw new Error(`Git diff failed: ${error.message}`);
    }
}
