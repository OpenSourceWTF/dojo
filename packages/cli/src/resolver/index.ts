/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { loadRegistry, Registry, SkillEntry } from '../registry/loader.js';
import { resolveSkill, detectCycle } from './dependencies.js';
import { join } from 'node:path';

export { resolveSkill, detectCycle } from './dependencies.js';
export type { ResolvedSkill } from './dependencies.js';

/**
 * Resolve dependencies for a skill FQN.
 * Returns array of FQNs in installation order (dependencies first).
 */
export async function resolveDependencies(
  fqn: string,
  registryPath?: string
): Promise<string[]> {
  const regPath = registryPath || join(process.cwd(), 'registry');
  const registry = await loadRegistry(regPath);

  // Check for circular dependencies
  const cycle = detectCycle(fqn, registry);
  if (cycle) {
    throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
  }

  const resolved = resolveSkill(fqn, registry);
  return resolved.map(r => r.fqn);
}
