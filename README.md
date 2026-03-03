# Wibe Crawler: An AI-Powered Autonomous Penetration Testing System

Wibe Crawler is a high-performance, AI-integrated security tool designed for deep web reconnaissance, automated vulnerability scanning, and professional report generation. Built on Electron, Svelte 5, and Puppeteer, it leverages the Groq SDK for context-aware security assessments.

![Dashboard Overview](ss/ss1.png)
*Discovered URLs panel showing crawled pages*

## 🚀 Key Features

- **Intelligent Deep Crawling**: Powered by Puppeteer, it navigates complex web architectures, capturing dynamic content, forms, and client-side interactions.
- **AI Vulnerability Analysis**: Context-aware security auditing using Groq's LLM (Llama 3.3/8B models) to identify OWASP Top 10 vulnerabilities with concrete proof.

![Vulnerability Analysis](ss/ss2.png)
*AI-identified vulnerabilities with severity classification*

- **Unified Reconnaissance Dashboard**:
    - **API Discovery**: Automatically maps endpoints, methods, and request/response patterns.
    - **Form Analysis**: Identifies sensitive input fields and potential injection points.
    - **Data Extraction**: Scrapes emails, assets (images, PDFs, documents), and cookies.
- **Directory Fuzzing**: Integrated brute-force engine for discovering hidden paths and sensitive directories.
- **Professional PDF Reporting**: Generates enterprise-grade security reports with executive summaries, technical details, and remediation steps.

![PDF Report](ss/ss3.png)
*Generated PDF report for testphp.vulnweb.com*

- **Multi-Key Management**: Intelligent API key pooling to manage rate limits and maximize AI analysis throughput.

![Detailed Findings](ss/ss4.png)
*Detailed findings with CVSS and CWE*

![Remediation](ss/ss5.png)
*Prioritised remediation recommendations from Critical to Low severity*

## 🛠️ Tech Stack

- **Frontend**: [Svelte 5](https://svelte.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Backend**: [Electron](https://www.electronjs.org/), [Node.js](https://nodejs.org/)
- **Core Engine**: [Puppeteer](https://pptr.dev/) (Crawling), [Groq SDK](https://groq.com/) (AI Analysis)
- **Utilities**: [jsPDF](https://github.com/parallax/jsPDF) (Reporting), [Zod](https://zod.dev/) (Validation), [Bun](https://bun.sh/) (Runtime/Package Manager)

## 📦 Installation & Setup

### Prerequisites
- [Bun](https://bun.sh/) (Recommended) or NPM/Node.js.

### 1. Clone & Install
```bash
git clone https://github.com/Mhmd-Aslam/wibe-crawler.git
cd wibe-crawler
bun install
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_key_here
# You can use multiple comma-separated keys for better throughput:
# GROQ_API_KEY=gsk_key1,gsk_key2,gsk_key3
```

## 🚀 Execution

### Development
```bash
bun run dev
```

### Build (Production)
```bash
# Windows
bun run build:win

# macOS
bun run build:mac

# Linux
bun run build:linux
```

## 📐 Architecture Overview

- **Main Process**: Handles the browser automation (Puppeteer), AI orchestration (Groq), security fuzzing, and filesystem operations.
- **Renderer Process**: A reactive Svelte 5 dashboard that provides real-time progress updates, data visualization, and interactive report configuration.
- **IPC Layer**: High-frequency communication channel between the crawler engine and the UI.

## ⚖️ Ethical Disclaimer

This tool is intended for **authorized security testing and educational purposes only**. Using this tool against targets without prior written consent is illegal. The developers assume no liability for misuse or damage caused by this application.
