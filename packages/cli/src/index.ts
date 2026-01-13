#!/usr/bin/env node
/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { Command } from 'commander';
import { learn } from './commands/learn.js';
import { search } from './commands/search.js';
import { list } from './commands/list.js';
import { sync } from './commands/sync.js';
import { unlearn } from './commands/unlearn.js';
import { cache } from './commands/cache.js';

const program = new Command();

program
  .name('dojo')
  .description('Dojo Skill Manager - Install and manage AI agent skills')
  .version('0.1.0');

// Learn command (with 'add' alias)
program.command('learn')
  .alias('add')
  .description('Install a skill (default: project-local, -g for global)')
  .argument('<skill>', 'Skill name or FQN (e.g., @org/skill)')
  .option('-g, --global', 'Install to global ~/.dojo/skills instead of project-local')
  .option('--registry <url>', 'Registry URL (local path or github:owner/repo)')
  .option('--skill', 'Install skill/workflow file only (no MCP servers)')
  .option('--workflow', 'Alias for --skill')
  .option('--mcp', 'Install MCP servers only (no skill files)')
  .option('--for <agents>', 'Specific agents (comma-separated: claude, gemini, cursor, codex)')
  .action((skill, opts) => learn(skill, {
    registry: opts.registry,
    skillOnly: opts.skill || opts.workflow,
    mcpOnly: opts.mcp,
    forAgents: opts.for ? opts.for.split(',') : undefined,
    global: opts.global
  }));

// Search command
program.command('search')
  .description('Search for skills in the registry')
  .argument('<term>', 'Search term')
  .option('--registry <url>', 'Registry URL (local path or github:owner/repo)')
  .action((term, opts) => search(term, { registry: opts.registry }));

// List command
program.command('list')
  .alias('ls')
  .description('List installed skills')
  .action(list);

// Sync command
program.command('sync')
  .description('Sync skills across agent formats')
  .option('-f, --force', 'Overwrite existing skills')
  .action(sync);

// Unlearn command (with 'rm' alias)
program.command('unlearn')
  .alias('rm')
  .description('Remove a skill (default: project-local, -g for global)')
  .argument('<skill>', 'Skill name to remove')
  .option('-g, --global', 'Remove from global ~/.dojo/skills and MCP configs')
  .option('-y, --yes', 'Skip confirmation')
  .action((skill, opts) => unlearn(skill, { yes: opts.yes, global: opts.global }));

// Cache command
program.command('cache')
  .description('Manage local cache')
  .argument('<action>', 'Action: clean or info')
  .action(cache);

program.parse();
