import * as fs from 'fs';
import * as path from 'path';

export interface BugbotConfig {
    model?: string;
    baseUrl?: string;
    systemPrompt?: string;
    exclude?: string[]; // Glob patterns to exclude
    temperature?: number;
}

const CONFIG_FILES = [
    'bugbot.config.json',
    '.bugbotrc.json',
    '.bugbotrc'
];

export function loadConfig(): BugbotConfig {
    const cwd = process.cwd();

    for (const file of CONFIG_FILES) {
        const configPath = path.join(cwd, file);
        if (fs.existsSync(configPath)) {
            try {
                const content = fs.readFileSync(configPath, 'utf-8');
                const config = JSON.parse(content);
                return config;
            } catch (e: any) {
                console.warn(`Warning: Failed to parse config file ${file}: ${e.message}`);
            }
        }
    }

    return {};
}
