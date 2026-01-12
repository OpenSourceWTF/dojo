import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

/**
 * Transform Claude skill to Gemini format (1:1 copy).
 * Claude and Gemini use identical markdown format.
 */
export function claudeToGemini(sourcePath: string, destPath: string): void {
  // Read source content
  const content = readFileSync(sourcePath, 'utf-8');

  // Ensure destination directory exists
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // Write to destination (1:1 copy)
  writeFileSync(destPath, content);
}

/**
 * Batch sync all Claude skills to Gemini format.
 * - Source: .claude/skills/*.md
 * - Dest: .agent/workflows/*.md
 */
export function syncClaudeToGemini(
  projectRoot: string
): { synced: string[]; skipped: string[] } {
  const synced: string[] = [];
  const skipped: string[] = [];

  const claudeDir = join(projectRoot, '.claude', 'skills');
  const geminiDir = join(projectRoot, '.agent', 'workflows');

  // Check if Claude skills directory exists
  if (!existsSync(claudeDir)) {
    return { synced, skipped };
  }

  // Get all files in Claude skills directory
  const files = readdirSync(claudeDir);

  for (const file of files) {
    // Only sync .md files
    if (!file.endsWith('.md')) {
      skipped.push(file);
      continue;
    }

    const sourcePath = join(claudeDir, file);
    const destPath = join(geminiDir, file);

    claudeToGemini(sourcePath, destPath);
    synced.push(file);
  }

  return { synced, skipped };
}
