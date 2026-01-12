import chalk from 'chalk';
import { searchRegistry, loadRegistry, SkillEntry } from '../registry/index.js';
import { resolveSkill, detectCycle } from '../resolver/dependencies.js';
import { downloadSkill } from '../download/github.js';
import { detectAgents, DetectedAgent } from '../agents/detector.js';
import { join } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import * as readline from 'node:readline';

interface LearnOptions {
  registryPath?: string;
}

/**
 * Parse skill input like "kungfu", "kungfu@1.0.0", or "@anthropics/create-docx"
 */
function parseSkillInput(input: string): { name: string; version?: string } {
  // Check for @version suffix (but not @org prefix)
  const atIndex = input.lastIndexOf('@');

  // If @ is at position 0, it's an FQN like @anthropics/skill
  // Check if there's another @ for version
  if (atIndex > 0) {
    const name = input.substring(0, atIndex);
    const version = input.substring(atIndex + 1);
    return { name, version };
  }

  return { name: input };
}

/**
 * Prompt user to select from multiple matches
 */
async function promptUserSelection(matches: { fqn: string; skill: SkillEntry }[]): Promise<string> {
  console.log(chalk.yellow('\nMultiple skills found. Please select one:\n'));

  matches.forEach((m, i) => {
    console.log(`  ${chalk.cyan(`[${i + 1}]`)} ${m.fqn}`);
    if (m.skill.description) {
      console.log(`      ${chalk.gray(m.skill.description)}`);
    }
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) => {
    rl.question(chalk.yellow('\nEnter number: '), (answer) => {
      rl.close();
      const index = parseInt(answer, 10) - 1;
      if (index >= 0 && index < matches.length) {
        resolve(matches[index].fqn);
      } else {
        reject(new Error('Invalid selection'));
      }
    });
  });
}

/**
 * Write skill to a specific agent directory
 */
async function writeSkillToAgent(
  agent: DetectedAgent,
  skillName: string,
  content: string
): Promise<string> {
  let destPath: string;

  switch (agent.format) {
    case 'flat-md':
      // Claude and Gemini use flat .md files
      destPath = join(agent.path, `${skillName}.md`);
      await mkdir(agent.path, { recursive: true });
      await writeFile(destPath, content);
      break;

    case 'folder-rule':
      // Cursor uses folder/RULE.md structure
      const folderPath = join(agent.path, skillName);
      destPath = join(folderPath, 'RULE.md');
      await mkdir(folderPath, { recursive: true });

      // Add Cursor frontmatter
      const lines = content.split('\n');
      let description = 'Imported from dojo';
      if (lines.length > 0 && lines[0].trim().length > 0) {
        description = lines[0].trim().replace(/^#\s*/, '');
      }

      const cursorContent = `---
name: ${skillName}
alwaysApply: false
description: ${description}
---

${content}`;
      await writeFile(destPath, cursorContent);
      break;

    default:
      throw new Error(`Unknown agent format: ${agent.format}`);
  }

  return destPath;
}

export async function learn(skill: string, options: LearnOptions = {}) {
  const projectRoot = process.cwd();
  const registryPath = options.registryPath || join(projectRoot, 'registry');

  // 1. Parse skill input
  const { name: skillQuery, version } = parseSkillInput(skill);

  console.log(chalk.blue(`🔍 Searching for "${skillQuery}"...`));

  // 2. Search registry
  const results = await searchRegistry(skillQuery, registryPath);

  if (results.length === 0) {
    console.log(chalk.red(`\n❌ No skills found matching "${skillQuery}"`));
    process.exit(1);
  }

  // 3. Select skill (prompt if multiple matches)
  let selectedFqn: string;

  // Check for exact FQN match first
  const exactMatch = results.find(r => r.fqn === skillQuery || r.fqn.endsWith(`/${skillQuery}`));

  if (exactMatch) {
    selectedFqn = exactMatch.fqn;
  } else if (results.length === 1) {
    selectedFqn = results[0].fqn;
  } else {
    // Multiple matches - prompt user
    selectedFqn = await promptUserSelection(results.map(r => ({ fqn: r.fqn, skill: r.skill })));
  }

  // 4. Load full registry for dependency resolution
  const registry = await loadRegistry(registryPath);
  const selectedSkill = registry.skills.get(selectedFqn);

  if (!selectedSkill) {
    console.log(chalk.red(`\n❌ Skill "${selectedFqn}" not found in registry`));
    process.exit(1);
  }

  // 5. Check for circular dependencies
  const cycle = detectCycle(selectedFqn, registry);
  if (cycle) {
    console.log(chalk.red(`\n❌ Circular dependency detected: ${cycle.join(' -> ')}`));
    process.exit(1);
  }

  // 6. Resolve dependencies
  const resolved = resolveSkill(selectedFqn, registry);
  const depCount = resolved.length - 1; // Exclude main skill

  if (depCount > 0) {
    console.log(chalk.blue(`📦 Installing ${selectedFqn} (+ ${depCount} dependencies)`));
  } else {
    console.log(chalk.blue(`📦 Installing ${selectedFqn}`));
  }

  // Display tree
  resolved.forEach((r, i) => {
    const prefix = i === resolved.length - 1 ? '   └── ' : '   ├── ';
    console.log(chalk.gray(prefix) + r.fqn);
  });

  // 7. Detect agents
  const agents = detectAgents(projectRoot);

  if (agents.length === 0) {
    console.log(chalk.yellow('\n⚠️  No agent directories detected. Creating .claude/skills...'));
    const claudePath = join(projectRoot, '.claude', 'skills');
    await mkdir(claudePath, { recursive: true });
    agents.push({ name: 'claude', path: claudePath, format: 'flat-md' });
  }

  // 8. Download and install each skill
  const installedPaths: string[] = [];

  for (const r of resolved) {
    const entry = r.entry;
    const rawName = entry.path || entry.name || r.fqn.split('/').pop() || r.fqn;
    // Ensure we use a flat filename (no subdirectories)
    const skillName = rawName.split('/').pop() || rawName;
    const skillVersion = version || 'main';

    // Download to temp location first (Claude format is canonical)
    const claudeAgent = agents.find(a => a.name === 'claude');
    const primaryPath = claudeAgent
      ? join(claudeAgent.path, `${skillName}.md`)
      : join(projectRoot, '.claude', 'skills', `${skillName}.md`);

    // Ensure directory exists
    await mkdir(join(projectRoot, '.claude', 'skills'), { recursive: true });

    try {
      await downloadSkill({
        source: entry.source,
        version: skillVersion,
        destPath: primaryPath
      });
    } catch (err) {
      console.log(chalk.red(`\n❌ Failed to download ${r.fqn}: ${(err as Error).message}`));
      process.exit(1);
    }

    // Read the downloaded content
    const content = await readFile(primaryPath, 'utf-8');

    // Write to all detected agent directories
    for (const agent of agents) {
      if (agent.name === 'claude') {
        installedPaths.push(primaryPath.replace(projectRoot + '/', ''));
        continue; // Already written
      }

      const destPath = await writeSkillToAgent(agent, skillName, content);
      installedPaths.push(destPath.replace(projectRoot + '/', ''));
    }
  }

  // 9. Display success
  console.log(chalk.green('\n✅ Installed to:'));
  for (const p of installedPaths) {
    console.log(chalk.gray(`   • ${p}`));
  }
}
