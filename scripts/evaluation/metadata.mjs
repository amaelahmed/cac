import { execSync } from 'child_process';

export function generateBenchmarkMetadata() {
  const timestamp = new Date().toISOString();
  
  let gitCommit = 'unknown';
  try {
    gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    // Ignore if not in a git repo
  }

  return {
    timestamp,
    git_commit: gitCommit,
    environment: 'evaluation',
    engine_version: 'v3',
    dataset_version: '1.0'
  };
}

export function formatMetadataMarkdown(metadata) {
  return `
---
## Benchmark Metadata
- **Timestamp**: ${metadata.timestamp}
- **Git Commit**: \`${metadata.git_commit}\`
- **Environment**: ${metadata.environment}
- **Engine Version**: ${metadata.engine_version}
- **Dataset Version**: ${metadata.dataset_version}
---
`;
}

export function formatExecutionSummary(metrics) {
  return `
## Execution Summary
- **Execution Duration**: ${metrics.durationMs}ms
- **Dataset Size**: ${metrics.datasetSize}
- **Assertions Executed**: ${metrics.assertionsExecuted}
- **Assertions Passed**: ${metrics.assertionsPassed}
- **Assertions Failed**: ${metrics.assertionsFailed}
- **Warnings**: ${metrics.warnings}
`;
}
