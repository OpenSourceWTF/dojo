import fs from 'fs/promises';
import path from 'path';

export async function claudeToCursor(sourcePath: string, destPath: string): Promise<void> {
  const content = await fs.readFile(sourcePath, 'utf-8');
  const skillName = path.basename(sourcePath, '.md');

  // Extract description from first line if it starts with text
  const lines = content.split('\n');
  let description = "Imported from dojo";
  if (lines.length > 0 && lines[0].trim().length > 0) {
    description = lines[0].trim().replace(/^#\s*/, ''); // Remove leading header marker
  }

  const ruleContent = `---
name: ${skillName}
alwaysApply: false
description: ${description}
---

${content}`;

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, ruleContent, 'utf-8');
}

export async function syncClaudeToCursor(projectRoot: string): Promise<{ synced: string[]; skipped: string[] }> {
  const skillsDir = path.join(projectRoot, '.claude/skills');
  const synced: string[] = [];
  const skipped: string[] = [];

  try {
    const files = await fs.readdir(skillsDir);

    for (const file of files) {
      if (path.extname(file) === '.md') {
        const sourcePath = path.join(skillsDir, file);
        const skillName = path.basename(file, '.md');
        const destPath = path.join(projectRoot, '.cursor/rules', skillName, 'RULE.md');

        await claudeToCursor(sourcePath, destPath);
        synced.push(file);
      } else {
        skipped.push(file);
      }
    }
  } catch (error) {
    // If directory doesn't exist, just return empty stats or throw?
    // Usually better to just log or throw if critical.
    // For CLI tools, maybe nice to fail soft if dir missing, but spec assumes existence.
    // Let's allow error to bubble up if readdir fails (e.g. missing .claude/skills)
    if ((error as any).code === 'ENOENT') {
      // If source doesn't exist, nothing to sync
      return { synced, skipped };
    }
    throw error;
  }

  return { synced, skipped };
}
