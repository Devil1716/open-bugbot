import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getGitDiff(target: string = 'HEAD'): Promise<string> {
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
    } catch (error: any) {
        throw new Error(`Git diff failed: ${error.message}`);
    }
}
