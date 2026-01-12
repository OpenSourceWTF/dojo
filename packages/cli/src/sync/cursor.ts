import fs from 'fs/promises';
import path from 'path';

export interface SyncOptions {
  force?: boolean;
}

export async function claudeToCursor(sourcePath: string, destPath: string, options: SyncOptions = {}): Promise<boolean> {
  if (!options.force) {
    try {
      await fs.access(destPath);
      // If no error, file exists -> skip
      return false;
    } catch {
      // File does not exist -> proceed
    }
  }

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
  return true;
}

export async function syncClaudeToCursor(projectRoot: string, options: SyncOptions = {}): Promise<{ synced: string[]; skipped: string[] }> {
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

        const wasSynced = await claudeToCursor(sourcePath, destPath, options);
        if (wasSynced) {
          synced.push(file);
        } else {
          skipped.push(file);
        }
      } else {
        skipped.push(file);
      }
    }
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return { synced, skipped };
    }
    throw error;
  }

  return { synced, skipped };
}