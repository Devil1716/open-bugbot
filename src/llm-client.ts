import OpenAI from 'openai';

interface LLMConfig {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
}

export class LocalLLMClient {
    private client: OpenAI;
    private model: string;

    constructor(config: LLMConfig = {}) {
        // Default to Ollama local instance
        this.client = new OpenAI({
            baseURL: config.baseUrl || 'http://localhost:11434/v1',
            apiKey: config.apiKey || 'ollama', // Ollama doesn't typically require an API key
        });
        this.model = config.model || 'mistral'; // Default to a common small model
    }

    async analyzeCode(fileContent: string, filename: string): Promise<string> {
        const prompt = `
You are an expert code reviewer acting as a "Bugbot". 
Your goal is to find critical bugs, logic errors, and security vulnerabilities in the code.
Do not report style issues or nitpicks.

File: ${filename}

${fileContent}

Analyze this file and list any critical issues you find. 
Return your response in a concise markdown format.
`;

        try {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
            });

            return completion.choices[0]?.message?.content || 'No response from LLM.';
        } catch (error: any) {
            return `Error connecting to LLM: ${error.message}`;
        }
    }
}
