import type { Registry, SkillEntry } from '../registry/loader.js';

export interface ResolvedSkill {
  fqn: string;
  entry: SkillEntry;
  order: number;
}

/**
 * Resolve skill and all its dependencies.
 * Returns array in installation order (dependencies first).
 */
export function resolveSkill(
  fqn: string,
  registry: Registry,
  visited?: Set<string>
): ResolvedSkill[] {
  const resolved: ResolvedSkill[] = [];
  const seen = visited || new Set<string>();

  function resolve(skillFqn: string): void {
    // Skip if already resolved
    if (seen.has(skillFqn)) return;

    const entry = registry.skills.get(skillFqn);
    if (!entry) {
      throw new Error(`Skill "${skillFqn}" not found in registry`);
    }

    // Mark as seen to prevent duplicates
    seen.add(skillFqn);

    // Resolve dependencies first (recursive)
    if (entry.dependencies && entry.dependencies.length > 0) {
      for (const dep of entry.dependencies) {
        resolve(dep);
      }
    }

    // Add this skill after its dependencies
    resolved.push({
      fqn: skillFqn,
      entry,
      order: resolved.length,
    });
  }

  resolve(fqn);
  return resolved;
}

/**
 * Check for circular dependencies.
 * Returns the cycle path if found, null otherwise.
 */
export function detectCycle(
  fqn: string,
  registry: Registry
): string[] | null {
  const visiting = new Set<string>(); // Currently in recursion stack
  const visited = new Set<string>();  // Fully processed
  let cyclePath: string[] | null = null;

  function dfs(skillFqn: string, path: string[]): boolean {
    // Found a cycle
    if (visiting.has(skillFqn)) {
      const cycleStart = path.indexOf(skillFqn);
      cyclePath = path.slice(cycleStart).concat(skillFqn);
      return true;
    }

    // Already fully processed, no cycle from here
    if (visited.has(skillFqn)) {
      return false;
    }

    const entry = registry.skills.get(skillFqn);
    if (!entry) {
      return false; // Missing dependency, not a cycle
    }

    visiting.add(skillFqn);
    path.push(skillFqn);

    if (entry.dependencies) {
      for (const dep of entry.dependencies) {
        if (dfs(dep, path)) {
          return true;
        }
      }
    }

    visiting.delete(skillFqn);
    visited.add(skillFqn);
    path.pop();

    return false;
  }

  dfs(fqn, []);
  return cyclePath;
}
