import * as github from '@actions/github';
import * as core from '@actions/core';

export class GitHubClient {
    private octokit: ReturnType<typeof github.getOctokit>;
    private context: typeof github.context;

    constructor(token: string) {
        this.octokit = github.getOctokit(token);
        this.context = github.context;
    }

    async postReviewComment(path: string, line: number, body: string, commitId: string) {
        try {
            if (!this.context.payload.pull_request) {
                console.warn('Not a pull request context. Skipping comment.');
                return;
            }

            await this.octokit.rest.pulls.createReviewComment({
                owner: this.context.repo.owner,
                repo: this.context.repo.repo,
                pull_number: this.context.payload.pull_request.number,
                body: body,
                path: path,
                line: line, // This must be the line index in the diff, not the file line number! 
                // WAIT. GitHub API requires 'line' to be the line in the diff (if using position) OR line in file (if using line + side).
                // Modern API accepts `line` (end line of range) and `side` (RIGHT/LEFT).
                // The `parse-diff` logic we have currently maps to the file line number.
                // We usually need the 'commit_id' to comment on a specific commit.
                commit_id: commitId,
                side: 'RIGHT'
            });
            console.log(`Posted comment on ${path}:${line}`);
        } catch (error: any) {
            console.error(`Failed to post comment: ${error.message}`);
        }
    }
}
