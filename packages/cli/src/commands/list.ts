/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface InstalledSkills {
  claude: string[];
  gemini: string[];
  cursor: string[];
}

/**
 * Get installed skills for each agent type.
 */
export function getInstalledSkills(projectRoot: string): InstalledSkills {
  const result: InstalledSkills = {
    claude: [],
    gemini: [],
    cursor: [],
  };

  // Claude (.claude/skills/*.md)
  const claudePath = join(projectRoot, '.claude', 'skills');
  if (existsSync(claudePath)) {
    result.claude = readdirSync(claudePath).filter((f) => f.endsWith('.md'));
  }

  // Gemini (.agent/workflows/*.md)
  const geminiPath = join(projectRoot, '.agent', 'workflows');
  if (existsSync(geminiPath)) {
    result.gemini = readdirSync(geminiPath).filter((f) => f.endsWith('.md'));
  }

  // Cursor (.cursor/rules/{name}/RULE.md)
  const cursorPath = join(projectRoot, '.cursor', 'rules');
  if (existsSync(cursorPath)) {
    result.cursor = readdirSync(cursorPath).filter((name) => {
      const rulePath = join(cursorPath, name, 'RULE.md');
      return existsSync(rulePath) && statSync(join(cursorPath, name)).isDirectory();
    });
  }

  return result;
}

/**
 * List installed skills per agent.
 * Note: When called from Commander, the first argument is options object.
 */
export async function list(options?: any): Promise<void> {
  const projectRoot = process.cwd();
  const skills = getInstalledSkills(projectRoot);

  console.log('Installed Skills:\n');

  // Claude
  console.log(chalk.cyan('Claude') + ' (.claude/skills/):');
  if (skills.claude.length > 0) {
    for (const skill of skills.claude) {
      console.log(`  • ${skill}`);
    }
  } else {
    console.log('  (none detected)');
  }
  console.log('');

  // Gemini
  console.log(chalk.green('Gemini') + ' (.agent/workflows/):');
  if (skills.gemini.length > 0) {
    for (const skill of skills.gemini) {
      console.log(`  • ${skill}`);
    }
  } else {
    console.log('  (none detected)');
  }
  console.log('');

  // Cursor
  console.log(chalk.yellow('Cursor') + ' (.cursor/rules/):');
  if (skills.cursor.length > 0) {
    for (const skill of skills.cursor) {
      console.log(`  • ${skill}`);
    }
  } else {
    console.log('  (none detected)');
  }
  console.log('');

  // Total
  const agentCount = [skills.claude, skills.gemini, skills.cursor].filter(
    (arr) => arr.length > 0
  ).length;

  const totalSkills = skills.claude.length + skills.gemini.length + skills.cursor.length;
  console.log(`Total: ${totalSkills} skills across ${agentCount} agents`);
}
