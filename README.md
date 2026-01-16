# OpenBugbot 🤖

**OpenBugbot** is an open-source, AI-powered code review agent. It works like "Cursor Bugbot" but runs entirely in your terminal, CI/CD pipeline, or local environment.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)

## Features

- **🛡️ Git Aware**: Only reviews *changed* lines (git diffs), saving money and noise.
- **🧠 Flexible AI**: Works with **Local LLMs** (Ollama) or **Cloud** (OpenAI, DeepSeek).
- **🤖 Agent Ready**: Designed to be used effectively by AI Agents like **Claude Code**.
- **⚡ CI/CD Native**: Posts comments directly to GitHub Pull Requests.

## Quick Start

### 1. Installation

```bash
npm install -g open-bugbot
# OR run via npx
npx open-bugbot --help
```

### 2. Usage

**Scan a file locally:**
```bash
npx open-bugbot scan src/app.ts
```

**Scan uncommitted changes (Git):**
```bash
npx open-bugbot diff
```

### 3. Configuration

Create a `bugbot.config.json` in your project root:

```json
{
  "model": "gpt-4o",
  "systemPrompt": "You are a security-focused reviewer. Flag XSS and SQLi.",
  "baseUrl": "https://api.openai.com/v1"
}
```

Environment Variables:
- `OPENAI_API_KEY`: Required if using cloud models.
- `GITHUB_TOKEN`: Required if running with `--ci`.

## CI/CD Integration (GitHub Actions)

Add this to your `.github/workflows/review.yml`:

```yaml
name: AI Review
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./path/to/open-bugbot # Or setup-node and run npx
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

## Local Development

1. Clone repo
2. `npm install`
3. `npm run build`
4. `node dist/cli.js diff`

## License

MIT
