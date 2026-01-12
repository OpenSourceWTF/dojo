import chalk from 'chalk';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { detectAgents } from '../agents/detector.js';
import { syncClaudeToGemini } from '../sync/gemini.js';
import { syncClaudeToCursor } from '../sync/cursor.js';

interface SyncOptions {
  force?: boolean;
}

interface SyncResult {
  agent: string;
  synced: number;
  skipped: number;
}

export async function sync(options: SyncOptions = {}) {
  const projectRoot = process.cwd();
  const claudeDir = join(projectRoot, '.claude', 'skills');

  console.log(chalk.blue('🔄 Syncing skills...\n'));

  // Check for canonical source (Claude)
  if (!existsSync(claudeDir)) {
    console.log(chalk.red('❌ No canonical source found. Create .claude/skills/ first'));
    process.exit(1);
  }

  // Count source skills
  const sourceFiles = readdirSync(claudeDir).filter(f => f.endsWith('.md'));
  const skillCount = sourceFiles.length;

  if (skillCount === 0) {
    console.log(chalk.yellow('⚠️  No skills found in .claude/skills/'));
    return;
  }

  console.log(chalk.white(`Source: .claude/skills/ (${skillCount} skills)\n`));

  // Detect target agents
  const agents = detectAgents(projectRoot);
  const results: SyncResult[] = [];

  // Sync to Gemini if detected
  const geminiAgent = agents.find(a => a.name === 'gemini');
  if (geminiAgent) {
    const { synced, skipped } = syncClaudeToGemini(projectRoot, { force: options.force });
    results.push({
      agent: '.agent/workflows/',
      synced: synced.length,
      skipped: skipped.length
    });
    console.log(chalk.gray(`→ .agent/workflows/: ${synced.length} synced, ${skipped.length} skipped`));
  }

  // Sync to Cursor if detected
  const cursorAgent = agents.find(a => a.name === 'cursor');
  if (cursorAgent) {
    const { synced, skipped } = await syncClaudeToCursor(projectRoot, { force: options.force });
    results.push({
      agent: '.cursor/rules/',
      synced: synced.length,
      skipped: skipped.length
    });
    console.log(chalk.gray(`→ .cursor/rules/: ${synced.length} synced, ${skipped.length} skipped`));
  }

  // Summary
  if (results.length === 0) {
    console.log(chalk.yellow('\n⚠️  No target agent directories found. Create .agent/workflows/ or .cursor/rules/'));
  } else {
    console.log(chalk.green('\n✅ Sync complete!'));
  }
}
