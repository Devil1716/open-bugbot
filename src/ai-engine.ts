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
      "suggestion": string
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
      return BugReportSchema.parse(parsed);
    } catch (e) {
      console.warn('Failed to parse AI response as JSON. Returning empty report.', e);
      console.log('Raw response:', response);
      return { issues: [] };
    }
  }
}
