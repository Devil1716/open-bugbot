import { z } from 'zod';

export const BugSchema = z.object({
    type: z.enum(['bug', 'security', 'performance', 'logic']),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    line: z.number().describe('The line number where the issue occurs (relative to the file, not the diff chunk)'),
    description: z.string().describe('Concise explanation of the issue'),
    suggestion: z.string().describe('Code snippet or text suggesting a fix'),
});

export const BugReportSchema = z.object({
    issues: z.array(BugSchema),
});

export type BugReport = z.infer<typeof BugReportSchema>;
