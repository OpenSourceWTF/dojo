import chalk from 'chalk';
import { existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Find all locations where a skill is installed.
 */
export function findSkillLocations(projectRoot: string, skillName: string): string[] {
  const locations: string[] = [];

  // Claude (.claude/skills/{skill}.md)
  const claudePath = join(projectRoot, '.claude', 'skills', `${skillName}.md`);
  if (existsSync(claudePath)) {
    locations.push(claudePath);
  }

  // Gemini (.agent/workflows/{skill}.md)
  const geminiPath = join(projectRoot, '.agent', 'workflows', `${skillName}.md`);
  if (existsSync(geminiPath)) {
    locations.push(geminiPath);
  }

  // Cursor (.cursor/rules/{skill}/)
  const cursorPath = join(projectRoot, '.cursor', 'rules', skillName);
  if (existsSync(cursorPath) && statSync(cursorPath).isDirectory()) {
    locations.push(cursorPath);
  }

  return locations;
}

/**
 * Remove skill from all provided locations.
 * Returns count of removed locations.
 */
export async function removeSkill(locations: string[]): Promise<number> {
  let removed = 0;

  for (const location of locations) {
    try {
      if (existsSync(location)) {
        const stat = statSync(location);
        if (stat.isDirectory()) {
          rmSync(location, { recursive: true });
        } else {
          rmSync(location);
        }
        removed++;
      }
    } catch (err) {
      console.error(chalk.red(`Failed to remove ${location}: ${err}`));
    }
  }

  return removed;
}

/**
 * Unlearn (remove) a skill from all agent directories.
 */
export async function unlearn(
  skill: string,
  options: { yes?: boolean } = {},
  projectRoot: string = process.cwd()
): Promise<void> {
  console.log(chalk.yellow(`🗑️  Removing "${skill}"...\n`));

  const locations = findSkillLocations(projectRoot, skill);

  if (locations.length === 0) {
    console.log(chalk.gray(`Skill "${skill}" not found in any location.`));
    return;
  }

  console.log('Found in:');
  for (const loc of locations) {
    // Show relative path
    const relative = loc.replace(projectRoot, '').replace(/^\//, '');
    console.log(`  • ${relative}`);
  }
  console.log('');

  // Skip confirmation if --yes flag
  if (!options.yes) {
    // In real CLI, we'd use readline or inquirer here
    // For now, just proceed (CLI integration will add confirmation)
    console.log(chalk.gray('(Use --yes to skip confirmation)'));
  }

  const removed = await removeSkill(locations);
  console.log(chalk.green(`\n✅ Removed ${skill} from ${removed} location${removed !== 1 ? 's' : ''}`));
}
