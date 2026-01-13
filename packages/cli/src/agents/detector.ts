/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface DetectedAgent {
  name: 'claude' | 'gemini' | 'cursor';
  path: string;        // Absolute path to skills dir
  format: 'flat-md' | 'folder-rule';
}

export function detectAgents(projectRoot: string): DetectedAgent[] {
  const agents: DetectedAgent[] = [];

  // Claude (.claude/skills)
  const claudePath = join(projectRoot, '.claude', 'skills');
  if (existsSync(claudePath)) {
    agents.push({ name: 'claude', path: claudePath, format: 'flat-md' });
  }

  // Gemini (.agent/workflows)
  const geminiPath = join(projectRoot, '.agent', 'workflows');
  if (existsSync(geminiPath)) {
    agents.push({ name: 'gemini', path: geminiPath, format: 'flat-md' });
  }

  // Cursor (.cursor/rules)
  const cursorPath = join(projectRoot, '.cursor', 'rules');
  if (existsSync(cursorPath)) {
    agents.push({ name: 'cursor', path: cursorPath, format: 'folder-rule' });
  }

  return agents;
}

export function hasAgents(projectRoot: string): boolean {
  return detectAgents(projectRoot).length > 0;
}
