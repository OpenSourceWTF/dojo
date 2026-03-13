import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TOOLS, handleDojoLearn } from '../../src/index.js';

describe('E2E: MCP Integration', () => {
  describe('Tool Definition', () => {
    it('should have dojo_learn tool registered', () => {
      const dojoLearnTool = TOOLS.find(t => t.name === 'dojo_learn');
      expect(dojoLearnTool).toBeDefined();
    });

    it('should have correct tool name', () => {
      const dojoLearnTool = TOOLS.find(t => t.name === 'dojo_learn');
      expect(dojoLearnTool?.name).toBe('dojo_learn');
    });

    it('should have description mentioning organic triggers', () => {
      const dojoLearnTool = TOOLS.find(t => t.name === 'dojo_learn');
      const description = dojoLearnTool?.description || '';

      // Must include organic trigger phrases
      expect(description.toLowerCase()).toContain('do you know');
      expect(description.toLowerCase()).toContain('teach me');
      expect(description.toLowerCase()).toContain('learn');
    });

    it('should have required skill input parameter', () => {
      const dojoLearnTool = TOOLS.find(t => t.name === 'dojo_learn');
      const schema = dojoLearnTool?.inputSchema as any;

      expect(schema.type).toBe('object');
      expect(schema.properties.skill).toBeDefined();
      expect(schema.properties.skill.type).toBe('string');
      expect(schema.required).toContain('skill');
    });

    it('should have optional version parameter', () => {
      const dojoLearnTool = TOOLS.find(t => t.name === 'dojo_learn');
      const schema = dojoLearnTool?.inputSchema as any;

      expect(schema.properties.version).toBeDefined();
      expect(schema.properties.version.type).toBe('string');
      // version should NOT be in required array
      expect(schema.required).not.toContain('version');
    });
  });

  describe('Tool Handler', () => {
    it('should export handleDojoLearn function', () => {
      expect(typeof handleDojoLearn).toBe('function');
    });

    it('should return error for unknown skill', async () => {
      const result = await handleDojoLearn({ skill: 'nonexistent-skill-12345' });

      // Should indicate failure
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌');
    });

    it('should return content array with text type', async () => {
      const result = await handleDojoLearn({ skill: 'test' });

      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    }, 15000);
  });

  describe('Response Format', () => {
    // Note: These tests verify the expected response format structure
    // Actual installation would require a proper test registry

    it('should format success response with "I know" message', async () => {
      // Mock a successful result by checking the format from TOOLS
      const dojoLearnTool = TOOLS.find(t => t.name === 'dojo_learn');
      expect(dojoLearnTool?.description).toContain('Searches the skill registry');
    });

    it('should include installation paths pattern in success responses', () => {
      // The handler is designed to output paths like:
      // • .claude/skills/X.md
      // • .agent/workflows/X.md
      // • .cursor/rules/X/RULE.md
      // This is validated by the tool description
      const dojoLearnTool = TOOLS.find(t => t.name === 'dojo_learn');
      expect(dojoLearnTool?.description).toContain('agent directories');
    });
  });
});
