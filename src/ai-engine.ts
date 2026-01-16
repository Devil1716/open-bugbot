import { LocalLLMClient } from './llm-client';
import { BugReportSchema, BugReport } from './schema';

export class AiEngine {
  private llm: LocalLLMClient;
  private systemPrompt: string | undefined;

  constructor(llm: LocalLLMClient, systemPrompt?: string) {
    this.llm = llm;
    this.systemPrompt = systemPrompt;
  }

  async analyzeDiff(diffContext: string, filename: string): Promise<BugReport> {
    const defaultSystemPrompt = `
You are an expert AI code reviewer. Your task is to analyze the provided git diff and identify critical bugs, security vulnerabilities, or logic errors.
Focus ONLY on the changes shown in the diff, but you may use the surrounding context to understand intent.

- Ignore style issues (indentation, spacing).
- Ignore missing documentation.
- Focus on high-confidence issues.

You must output your response in valid JSON format matching this schema:
{
  "issues": [
    {
      "type": "bug" | "security" | "performance" | "logic",
      "severity": "critical" | "high" | "medium" | "low",
      "line": number,
      "description": string,
      "suggestion": string,
      "fix": {
          "type": "replace",
          "original": "exact string match in file",
          "replacement": "new code"
      } // Optional: Include only if confident
    }
  ]
}

If no issues are found, return { "issues": [] }.
`;

    // Use user-provided prompt if available, otherwise default
    const effectiveSystemPrompt = this.systemPrompt || defaultSystemPrompt;

    const prompt = `
${effectiveSystemPrompt}

File: ${filename}
Diff:
${diffContext}
`;

    const response = await this.llm.analyzeCode(prompt, filename);

    // Attempt to parse JSON
    try {
      // Clean up markdown code blocks if present
      const cleanJson = response.replace(/^```json/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      const report = BugReportSchema.parse(parsed);

      // Filter false positives using Memory
      // Note: In a real diff context, we might not have the full file content easily available here 
      // to grab the exact line content for hashing if it's not in the diff chunk.
      // But for 'fix' command we send full file context. 
      // For now, let's just attempt to filter if we can interact with Memory.

      try {
        const { MemoryManager } = await import('./memory');
        const memory = new MemoryManager();

        report.issues = report.issues.filter(issue => {
          // Warning: We don't have easy access to the exact line content here without re-reading the file or parsing the diff context string.
          // However, the hash depends on it. 
          // Weakness: If we don't have lineContent, we can't accurately check the hash.
          // Improvement for V3: Pass file content or read it here if possible. 
          // For now, let's assume we can't reliably filter without line content unless we parse the context.
          return true;
        });
      } catch (e) {
        // Memory module might not be available or other error
      }

      return report;
    } catch (e) {
      console.warn('Failed to parse AI response as JSON. Returning empty report.', e);
      console.log('Raw response:', response);
      return { issues: [] };
    }
  }

  // Method to inject preferences into prompt
  async getAugmentedSystemPrompt(basePrompt: string): Promise<string> {
    try {
      const { MemoryManager } = await import('./memory');
      const memory = new MemoryManager();
      const prefs = memory.getPreferences();
      if (prefs.length > 0) {
        return `${basePrompt}\n\nUser Preferences (ALWAYS FOLLOW):\n- ${prefs.join('\n- ')}`;
      }
    } catch (e) { }
    return basePrompt;
  }
}
