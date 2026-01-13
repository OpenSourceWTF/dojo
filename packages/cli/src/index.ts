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
  .version('0.1.0')
  .addHelpText('after', `
Examples:
  $ dojo learn tdd                   # Install TDD skill
  $ dojo learn @anthropics/create-docx
  $ dojo search testing              # Search for testing skills
  $ dojo list                        # List installed skills
  $ dojo unlearn my-skill -g         # Remove globally
`);

// Learn command (with 'add' alias)
program.command('learn')
  .alias('add')
  .description('Install a skill from the registry')
  .argument('<skill>', 'Skill name, FQN (@org/skill), or alias')
  .option('-g, --global', 'Install to global ~/.dojo/skills (shared across projects)')
  .option('--registry <url>', 'Custom registry (local path or github:owner/repo)')
  .option('--mcp', 'Install MCP servers only (skip skill files)')
  .option('--for <agents>', 'Target specific agents (comma-separated: claude,gemini,cursor,codex)')
  .addHelpText('after', `
Examples:
  $ dojo learn tdd                    # Install by name
  $ dojo learn @anthropics/create-docx # Install by FQN
  $ dojo learn mcp-playwright --mcp   # Install MCP server only
  $ dojo learn my-skill --for=claude  # Install to Claude only
  $ dojo learn skill -g               # Install globally
`)
  .action((skill, opts) => learn(skill, {
    registry: opts.registry,
    mcpMode: opts.mcp,
    forAgents: opts.for ? opts.for.split(',') : undefined,
    global: opts.global
  }));

// Search command
program.command('search')
  .description('Search for skills in the registry')
  .argument('<term>', 'Search term (matches name, description, tags)')
  .option('--registry <url>', 'Custom registry (local path or github:owner/repo)')
  .option('--mcp', 'Filter to MCP servers only')
  .addHelpText('after', `
Examples:
  $ dojo search testing               # Find testing-related skills
  $ dojo search browser --mcp         # Find MCP servers for browser automation
  $ dojo search tdd                   # Find TDD skills
`)
  .action((term, opts) => search(term, { registry: opts.registry, mcpMode: opts.mcp }));

// List command
program.command('list')
  .alias('ls')
  .description('List installed skills or configured MCP servers')
  .option('--mcp', 'List configured MCP servers instead of skills')
  .addHelpText('after', `
Examples:
  $ dojo list                         # List installed skills
  $ dojo ls                           # Alias for list
  $ dojo list --mcp                   # List configured MCP servers
`)
  .action((opts) => list({ mcpMode: opts.mcp }));

// Sync command
program.command('sync')
  .description('Sync custom skills across agent formats')
  .option('-f, --force', 'Overwrite existing skills')
  .addHelpText('after', `
Examples:
  $ dojo sync                         # Sync all custom skills
  $ dojo sync -f                      # Force overwrite existing
`)
  .action(sync);

// Unlearn command (with 'rm' alias)
program.command('unlearn')
  .alias('rm')
  .description('Remove a skill from agent directories')
  .argument('<skill>', 'Skill name to remove')
  .option('-g, --global', 'Remove from global storage and all MCP configs')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--mcp', 'Remove MCP servers only (keep skill files)')
  .option('--for <agents>', 'Remove from specific agents only (comma-separated)')
  .addHelpText('after', `
Examples:
  $ dojo unlearn my-skill             # Remove local skill
  $ dojo rm my-skill                  # Alias for unlearn
  $ dojo unlearn my-skill -g          # Remove globally
  $ dojo unlearn server --mcp -g      # Remove MCP server config only
  $ dojo unlearn skill --for=claude   # Remove from Claude only
`)
  .action((skill, opts) => unlearn(skill, {
    yes: opts.yes,
    global: opts.global,
    mcpMode: opts.mcp,
    forAgents: opts.for ? opts.for.split(',') : undefined
  }));

// Cache command
program.command('cache')
  .description('Manage the local registry cache')
  .argument('<action>', 'Action: clean (clear cache) or info (show cache stats)')
  .addHelpText('after', `
Examples:
  $ dojo cache clean                  # Clear the registry cache
  $ dojo cache info                   # Show cache information
`)
  .action(cache);

program.parse();
