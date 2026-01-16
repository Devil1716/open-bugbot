"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitDiff = parseGitDiff;
const parse_diff_1 = __importDefault(require("parse-diff"));
function parseGitDiff(diffOutput) {
    const files = (0, parse_diff_1.default)(diffOutput);
    return files.map(file => {
        if (!file.to)
            return null;
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
    }).filter((f) => f !== null && f.chunks.length > 0);
}
