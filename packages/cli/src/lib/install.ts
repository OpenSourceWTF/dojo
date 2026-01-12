import { searchRegistry, loadRegistry, SkillEntry } from '../registry/index.js';
import { resolveSkill, detectCycle } from '../resolver/dependencies.js';
import { downloadSkill } from '../download/github.js';
import { detectAgents, DetectedAgent } from '../agents/detector.js';
import { join } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

export interface InstallResult {
  success: boolean;
  message: string;
  installedPaths: string[];
  fqn?: string;
}

export interface InstallOptions {
  registryPath?: string;
  projectRoot?: string;
  version?: string;
}

/**
 * Parse skill input like "kungfu", "kungfu@1.0.0", or "@anthropics/create-docx"
 */
export function parseSkillInput(input: string): { name: string; version?: string } {
  const atIndex = input.lastIndexOf('@');

  if (atIndex > 0) {
    const name = input.substring(0, atIndex);
    const version = input.substring(atIndex + 1);
    return { name, version };
  }

  return { name: input };
}

/**
 * Write skill to a specific agent directory
 */
export async function writeSkillToAgent(
  agent: DetectedAgent,
  skillName: string,
  content: string
): Promise<string> {
  let destPath: string;

  switch (agent.format) {
    case 'flat-md':
      destPath = join(agent.path, `${skillName}.md`);
      await mkdir(agent.path, { recursive: true });
      await writeFile(destPath, content);
      break;

    case 'folder-rule':
      const folderPath = join(agent.path, skillName);
      destPath = join(folderPath, 'RULE.md');
      await mkdir(folderPath, { recursive: true });

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

export async function installSkill(
  skillQuery: string,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const projectRoot = options.projectRoot || process.cwd();
  const registryPath = options.registryPath || join(projectRoot, 'registry');

  // 1. Search registry
  const results = await searchRegistry(skillQuery, registryPath);

  if (results.length === 0) {
    return {
      success: false,
      message: `No skills found matching "${skillQuery}"`, 
      installedPaths: []
    };
  }

  // If multiple results and no exact match, we need the caller to decide
  const exactMatch = results.find(r => r.fqn === skillQuery || r.fqn.endsWith(`/${skillQuery}`));
  
  let selectedFqn: string;
  if (exactMatch) {
    selectedFqn = exactMatch.fqn;
  } else if (results.length === 1) {
    selectedFqn = results[0].fqn;
  } else {
    return {
      success: false,
      message: `Multiple skills found: ${results.map(r => r.fqn).join(', ')}. Please be more specific.`, 
      installedPaths: []
    };
  }

  // 2. Resolve dependencies
  const registry = await loadRegistry(registryPath);
  const cycle = detectCycle(selectedFqn, registry);
  if (cycle) {
    return {
      success: false,
      message: `Circular dependency detected: ${cycle.join(' -> ')}`, 
      installedPaths: []
    };
  }

  const resolved = resolveSkill(selectedFqn, registry);

  // 3. Detect agents
  const agents = detectAgents(projectRoot);
  if (agents.length === 0) {
    const claudePath = join(projectRoot, '.claude', 'skills');
    await mkdir(claudePath, { recursive: true });
    agents.push({ name: 'claude', path: claudePath, format: 'flat-md' });
  }

  // 4. Download and install
  const installedPaths: string[] = [];

  for (const r of resolved) {
    const entry = r.entry;
    const skillName = entry.path || entry.name || r.fqn.split('/').pop() || r.fqn;
    const skillVersion = options.version || 'main';

    const claudeAgent = agents.find(a => a.name === 'claude');
    const primaryPath = claudeAgent
      ? join(claudeAgent.path, `${skillName}.md`)
      : join(projectRoot, '.claude', 'skills', `${skillName}.md`);

    await mkdir(join(projectRoot, '.claude', 'skills'), { recursive: true });

    try {
      await downloadSkill({
        source: entry.source,
        version: skillVersion,
        destPath: primaryPath
      });
    } catch (err) {
      return {
        success: false,
        message: `Failed to download ${r.fqn}: ${(err as Error).message}`, 
        installedPaths
      };
    }

    const content = await readFile(primaryPath, 'utf-8');

    for (const agent of agents) {
      if (agent.name === 'claude') {
        installedPaths.push(primaryPath.replace(projectRoot + '/', ''));
        continue;
      }

      const destPath = await writeSkillToAgent(agent, skillName, content);
      installedPaths.push(destPath.replace(projectRoot + '/', ''));
    }
  }

  return {
    success: true,
    message: `Successfully installed ${selectedFqn}`, 
    installedPaths,
    fqn: selectedFqn
  };
}
