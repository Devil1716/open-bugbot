import * as fs from 'fs';
import * as path from 'path';

export interface BugbotConfig {
    model?: string;
    baseUrl?: string;
    systemPrompt?: string;
    exclude?: string[]; // Glob patterns to exclude
    temperature?: number;
    verbose?: boolean;
}

const CONFIG_FILES = [
    'bugbot.config.json',
    '.bugbotrc.json',
    '.bugbotrc'
];

export function loadConfig(verbose: boolean = false): BugbotConfig {
    const cwd = process.cwd();

    for (const file of CONFIG_FILES) {
        const configPath = path.join(cwd, file);
        if (verbose) {
            console.log(`Checking for config at: ${configPath}`);
        }
        if (fs.existsSync(configPath)) {
            try {
                if (verbose) console.log(`Found config file: ${configPath}`);
                const content = fs.readFileSync(configPath, 'utf-8');
                const config = JSON.parse(content);
                return { ...config, verbose };
            } catch (e: any) {
                console.warn(`Warning: Failed to parse config file ${file}: ${e.message}`);
            }
        }
    }

    if (verbose) console.log('No config file found, using defaults.');
    return { verbose };
}
