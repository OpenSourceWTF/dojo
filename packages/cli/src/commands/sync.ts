/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { claudePlugin } from '../agents/plugins/claude.js';
import { antigravityPlugin } from '../agents/plugins/antigravity.js';
import { cursorPlugin } from '../agents/plugins/cursor.js';
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

  console.log(chalk.blue('🔄 Syncing skills...\n'));

  // Check for canonical source (Claude) using plugin
  const claudeAgent = claudePlugin.detect(projectRoot);
  if (!claudeAgent) {
    console.log(chalk.red(`❌ No canonical source found. Create ${claudePlugin.agentDir} first`));
    process.exit(1);
  }

  // Count source skills using plugin
  const sourceSkills = claudePlugin.listSkills(projectRoot);
  const skillCount = sourceSkills.length;

  if (skillCount === 0) {
    console.log(chalk.yellow(`⚠️  No skills found in ${claudePlugin.agentDir}`));
    return;
  }

  console.log(chalk.white(`Source: ${claudePlugin.agentDir} (${skillCount} skills)\n`));

  // Detect target agents
  const agents = detectAgents(projectRoot);
  const results: SyncResult[] = [];

  // Sync to Antigravity if detected (uses flat-md format)
  const antigravityAgent = agents.find(a => a.name === antigravityPlugin.name);
  if (antigravityAgent) {
    const { synced, skipped } = syncClaudeToGemini(projectRoot, { force: options.force });
    results.push({
      agent: antigravityPlugin.agentDir,
      synced: synced.length,
      skipped: skipped.length
    });
    console.log(chalk.gray(`→ ${antigravityPlugin.agentDir}: ${synced.length} synced, ${skipped.length} skipped`));
  }

  // Sync to Cursor if detected
  const cursorAgent = agents.find(a => a.name === cursorPlugin.name);
  if (cursorAgent) {
    const { synced, skipped } = await syncClaudeToCursor(projectRoot, { force: options.force });
    results.push({
      agent: cursorPlugin.agentDir,
      synced: synced.length,
      skipped: skipped.length
    });
    console.log(chalk.gray(`→ ${cursorPlugin.agentDir}: ${synced.length} synced, ${skipped.length} skipped`));
  }

  // Summary
  if (results.length === 0) {
    console.log(chalk.yellow(`\n⚠️  No target agent directories found. Create ${antigravityPlugin.agentDir} or ${cursorPlugin.agentDir}`));
  } else {
    console.log(chalk.green('\n✅ Sync complete!'));
  }
}
