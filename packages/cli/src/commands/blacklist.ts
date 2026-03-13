/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { loadBlacklist, checkBlacklist } from '../blacklist/index.js';
import type { Blacklist, BlacklistEntry } from '../blacklist/index.js';

const LOCAL_BLACKLIST_DIR = join(homedir(), '.dojo');
const LOCAL_BLACKLIST_FILE = join(LOCAL_BLACKLIST_DIR, 'blacklist.json');

/**
 * Load the user's local blacklist overrides.
 */
async function loadLocalBlacklist(): Promise<Blacklist> {
  try {
    const content = await readFile(LOCAL_BLACKLIST_FILE, 'utf-8');
    return JSON.parse(content) as Blacklist;
  } catch {
    return { version: '1.0.0', updated: '', entries: {} };
  }
}

/**
 * Save the user's local blacklist.
 */
async function saveLocalBlacklist(blacklist: Blacklist): Promise<void> {
  blacklist.updated = new Date().toISOString().split('T')[0];
  await mkdir(LOCAL_BLACKLIST_DIR, { recursive: true });
  await writeFile(LOCAL_BLACKLIST_FILE, JSON.stringify(blacklist, null, 2));
}

/**
 * Severity color mapping.
 */
function severityColor(severity: string): (text: string) => string {
  switch (severity) {
    case 'critical': return chalk.red.bold;
    case 'high': return chalk.red;
    case 'medium': return chalk.yellow;
    case 'low': return chalk.gray;
    default: return chalk.white;
  }
}

interface BlacklistOptions {
  registry?: string;
}

/**
 * List all blacklisted skills (remote + local).
 */
export async function blacklistList(options: BlacklistOptions = {}) {
  const isLocal = Boolean(options.registry && !options.registry.startsWith('github:') && !options.registry.startsWith('https://'));

  const remote = await loadBlacklist({
    localPath: isLocal ? options.registry : undefined,
  });
  const local = await loadLocalBlacklist();

  const remoteEntries = Object.entries(remote.entries);
  const localEntries = Object.entries(local.entries);

  if (remoteEntries.length === 0 && localEntries.length === 0) {
    console.log(chalk.green('No blacklisted skills.'));
    return;
  }

  if (remoteEntries.length > 0) {
    console.log(chalk.cyan.bold('Registry blacklist') + chalk.gray(` (${remoteEntries.length} entries)`));
    console.log(chalk.gray(`  Updated: ${remote.updated || 'unknown'}\n`));

    for (const [name, entry] of remoteEntries) {
      const sev = severityColor(entry.severity)(`[${entry.severity.toUpperCase()}]`);
      console.log(`  ${sev} ${chalk.white.bold(name)}`);
      console.log(`    ${chalk.gray(entry.reason)}`);
      if (entry.cve) {
        console.log(`    ${chalk.yellow(`CVE: ${entry.cve}`)}`);
      }
      console.log('');
    }
  }

  if (localEntries.length > 0) {
    console.log(chalk.cyan.bold('Local blacklist') + chalk.gray(` (${localEntries.length} entries)`));
    console.log(chalk.gray(`  Path: ${LOCAL_BLACKLIST_FILE}`));
    console.log(chalk.gray(`  Updated: ${local.updated || 'unknown'}\n`));

    for (const [name, entry] of localEntries) {
      const sev = severityColor(entry.severity)(`[${entry.severity.toUpperCase()}]`);
      console.log(`  ${sev} ${chalk.white.bold(name)}`);
      console.log(`    ${chalk.gray(entry.reason)}`);
      console.log('');
    }
  }
}

/**
 * Check if a specific skill is blacklisted.
 */
export async function blacklistCheck(skill: string, options: BlacklistOptions = {}) {
  const isLocal = Boolean(options.registry && !options.registry.startsWith('github:') && !options.registry.startsWith('https://'));

  const remote = await loadBlacklist({
    localPath: isLocal ? options.registry : undefined,
  });
  const local = await loadLocalBlacklist();

  const remoteHit = checkBlacklist(skill, remote);
  const localHit = checkBlacklist(skill, local);

  if (!remoteHit && !localHit) {
    console.log(chalk.green(`✓ "${skill}" is not blacklisted.`));
    return;
  }

  if (remoteHit) {
    const sev = severityColor(remoteHit.severity)(`[${remoteHit.severity.toUpperCase()}]`);
    console.log(chalk.red(`✗ "${skill}" is blacklisted (registry)`));
    console.log(`  ${sev} ${remoteHit.reason}`);
    console.log(`  ${chalk.gray(`Reported: ${remoteHit.reported}`)}`);
    if (remoteHit.cve) {
      console.log(`  ${chalk.yellow(`CVE: ${remoteHit.cve}`)}`);
    }
  }

  if (localHit) {
    const sev = severityColor(localHit.severity)(`[${localHit.severity.toUpperCase()}]`);
    console.log(chalk.red(`✗ "${skill}" is blacklisted (local)`));
    console.log(`  ${sev} ${localHit.reason}`);
  }
}

/**
 * Add a skill to the local blacklist.
 */
export async function blacklistAdd(
  skill: string,
  options: { reason?: string; severity?: string } = {}
) {
  const local = await loadLocalBlacklist();

  if (local.entries[skill]) {
    console.log(chalk.yellow(`"${skill}" is already in the local blacklist.`));
    return;
  }

  const entry: BlacklistEntry = {
    reason: options.reason || 'Manually blacklisted by user',
    reported: new Date().toISOString().split('T')[0],
    severity: (options.severity as BlacklistEntry['severity']) || 'high',
    cve: null,
  };

  local.entries[skill] = entry;
  await saveLocalBlacklist(local);

  console.log(chalk.green(`✓ Added "${skill}" to local blacklist.`));
  console.log(chalk.gray(`  Reason: ${entry.reason}`));
  console.log(chalk.gray(`  Path: ${LOCAL_BLACKLIST_FILE}`));
}

/**
 * Remove a skill from the local blacklist.
 */
export async function blacklistRemove(skill: string) {
  const local = await loadLocalBlacklist();

  if (!local.entries[skill]) {
    console.log(chalk.yellow(`"${skill}" is not in the local blacklist.`));

    // Check if it's in the remote blacklist
    const remote = await loadBlacklist();
    const remoteHit = checkBlacklist(skill, remote);
    if (remoteHit) {
      console.log(chalk.gray('Note: This skill is in the registry blacklist, which cannot be modified locally.'));
    }
    return;
  }

  delete local.entries[skill];
  await saveLocalBlacklist(local);

  console.log(chalk.green(`✓ Removed "${skill}" from local blacklist.`));
}
