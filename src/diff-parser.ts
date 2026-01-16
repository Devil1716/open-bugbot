import parseDiff from 'parse-diff';

export interface ChangedFile {
    to: string; // File path
    chunks: string[]; // Converted chunks to string (for LLM)
    changeCount: number;
}

export function parseGitDiff(diffOutput: string): ChangedFile[] {
    const files = parseDiff(diffOutput);

    return files.map(file => {
        if (!file.to) return null;

        // We only care about added/modified content
        // We construct a string representation of chunks for the LLM
        const chunks = file.chunks.map(chunk => {
            const header = chunk.content;
            const lines = chunk.changes.map(change => {
                // change.type is 'add', 'del', 'normal'
                const prefix = change.type === 'add' ? '+' : change.type === 'del' ? '-' : ' ';
                return `${prefix} ${change.content}`;
            });
            return [header, ...lines].join('\n');
        });

        return {
            to: file.to,
            chunks: chunks,
            changeCount: file.additions + file.deletions
        };
    }).filter((f): f is ChangedFile => f !== null && f.chunks.length > 0);
}
