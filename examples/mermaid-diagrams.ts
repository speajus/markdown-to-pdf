/**
 * Example: Rendering Mermaid diagrams in PDFs
 *
 * Mermaid fenced code blocks are automatically detected and rendered as
 * diagrams. Theme colors are integrated — each built-in theme includes
 * matching mermaid colors, or you can provide custom ones.
 */

import { generatePdf, defaultTheme } from '../src/index.js';
import type { MermaidThemeConfig } from '../src/types.js';
import fs from 'fs';

// ============================================================================
// Example 1: Default mermaid rendering (uses theme's mermaid config)
// ============================================================================
async function example1_defaultMermaid() {
  const markdown = `
# Project Architecture

\`\`\`mermaid
flowchart TD
    Client[Browser] --> API[REST API]
    API --> Auth[Auth Service]
    API --> DB[(Database)]
    API --> Cache[(Redis Cache)]
    Auth --> DB
\`\`\`
  `;

  const buffer = await generatePdf(markdown);
  fs.writeFileSync('output/mermaid-example1.pdf', buffer);
  console.log('Example 1: Default mermaid rendering');
}

// ============================================================================
// Example 2: Using a built-in mermaid theme preset
// ============================================================================
async function example2_mermaidThemePreset() {
  const markdown = `
# Sequence Diagram — Forest Theme

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant S as Server
    participant D as Database

    U->>S: Login Request
    S->>D: Validate Credentials
    D-->>S: User Record
    S-->>U: JWT Token
\`\`\`
  `;

  const buffer = await generatePdf(markdown, {
    theme: { ...defaultTheme, mermaid: 'forest' },
  });
  fs.writeFileSync('output/mermaid-example2.pdf', buffer);
  console.log('Example 2: Forest mermaid theme preset');
}

// ============================================================================
// Example 3: Custom mermaid colors
// ============================================================================
async function example3_customMermaidColors() {
  const markdown = `
# Custom-Themed Class Diagram

\`\`\`mermaid
classDiagram
    class Vehicle {
        +String make
        +String model
        +start()
        +stop()
    }
    class Car {
        +int doors
        +drive()
    }
    class Truck {
        +int payload
        +haul()
    }
    Vehicle <|-- Car
    Vehicle <|-- Truck
\`\`\`
  `;

  const customMermaid: MermaidThemeConfig = {
    background: '#fffbf0',
    primaryColor: '#ff6b35',
    secondaryColor: '#ffd166',
    tertiaryColor: '#fff3e0',
    primaryTextColor: '#2d2d2d',
    secondaryTextColor: '#666666',
    lineColor: '#ff6b35',
    borderColor: '#e65100',
    fontFamily: 'Helvetica',
    fontSize: 14,
  };

  const buffer = await generatePdf(markdown, {
    theme: { ...defaultTheme, mermaid: customMermaid },
  });
  fs.writeFileSync('output/mermaid-example3.pdf', buffer);
  console.log('Example 3: Custom mermaid colors');
}

// ============================================================================
// Example 4: Mixed content — mermaid alongside regular markdown
// ============================================================================
async function example4_mixedContent() {
  const markdown = `
# Release Process

The following diagram shows our release workflow:

\`\`\`mermaid
stateDiagram-v2
    [*] --> Development
    Development --> CodeReview : PR Created
    CodeReview --> Development : Changes Requested
    CodeReview --> Staging : Approved
    Staging --> Production : QA Passed
    Staging --> Development : QA Failed
    Production --> [*]
\`\`\`

## Key Steps

1. **Development** — feature branches with unit tests
2. **Code Review** — peer review via pull requests
3. **Staging** — automated QA and integration tests
4. **Production** — blue-green deployment

> All deployments are tracked in our release dashboard.
  `;

  const buffer = await generatePdf(markdown);
  fs.writeFileSync('output/mermaid-example4.pdf', buffer);
  console.log('Example 4: Mixed mermaid and markdown content');
}

// Run all examples
async function main() {
  fs.mkdirSync('output', { recursive: true });
  await example1_defaultMermaid();
  await example2_mermaidThemePreset();
  await example3_customMermaidColors();
  await example4_mixedContent();
}

main().catch(console.error);

