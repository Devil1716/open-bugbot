import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface MemoryData {
    falsePositives: string[]; // Hashes of (filename + description + line context)
    preferences: string[];    // User preferences derived from interaction
}

export class MemoryManager {
    private memoryPath: string;
    private data: MemoryData;

    constructor() {
        this.memoryPath = path.join(process.cwd(), '.bugbot', 'memory.json');
        this.data = this.loadMemory();
    }

    private loadMemory(): MemoryData {
        if (!fs.existsSync(this.memoryPath)) {
            return { falsePositives: [], preferences: [] };
        }
        try {
            return JSON.parse(fs.readFileSync(this.memoryPath, 'utf-8'));
        } catch (e) {
            return { falsePositives: [], preferences: [] };
        }
    }

    private saveMemory() {
        const dir = path.dirname(this.memoryPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.memoryPath, JSON.stringify(this.data, null, 2));
    }

    // Generate a stable hash for a bug to identify it across runs
    private hashBug(filename: string, description: string, lineContent: string): string {
        return crypto.createHash('md5').update(`${filename}:${description}:${lineContent.trim()}`).digest('hex');
    }

    addFalsePositive(filename: string, description: string, lineContent: string) {
        const hash = this.hashBug(filename, description, lineContent);
        if (!this.data.falsePositives.includes(hash)) {
            this.data.falsePositives.push(hash);
            this.saveMemory();
        }
    }

    isFalsePositive(filename: string, description: string, lineContent: string): boolean {
        const hash = this.hashBug(filename, description, lineContent);
        return this.data.falsePositives.includes(hash);
    }

    addPreference(preference: string) {
        if (!this.data.preferences.includes(preference)) {
            this.data.preferences.push(preference);
            this.saveMemory();
        }
    }

    getPreferences(): string[] {
        return this.data.preferences;
    }
}
