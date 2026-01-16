declare module 'parse-diff' {
    interface Change {
        type: 'add' | 'del' | 'normal';
        content: string;
        ln?: number;
        ln1?: number;
        ln2?: number;
    }

    interface Chunk {
        content: string;
        changes: Change[];
        oldStart: number;
        oldLines: number;
        newStart: number;
        newLines: number;
    }

    interface File {
        from?: string;
        to?: string;
        chunks: Chunk[];
        deletions: number;
        additions: number;
        index?: string[];
    }

    function parse(input: string): File[];
    export = parse;
}
