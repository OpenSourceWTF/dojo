import { describe, it, expect, vi } from 'vitest';
import { handleDojoLearn } from "../src/index.js";
import * as installLib from "@opensourcewtf/dojo-cli/lib/install.js";

// Mock installSkill
vi.mock("@opensourcewtf/dojo-cli/lib/install.js", () => ({
  installSkill: vi.fn()
}));

describe('MCP dojo_learn tool', () => {
  it('should return success message in correct format', async () => {
    const mockResult = {
      success: true,
      message: 'Successfully installed @community/kungfu',
      installedPaths: [
        '.claude/skills/kungfu.md',
        '.agent/workflows/kungfu.md',
        '.cursor/rules/kungfu/RULE.md'
      ],
      fqn: '@community/kungfu'
    };
    
    (installLib.installSkill as any).mockResolvedValue(mockResult);

    // Call the handler directly
    const response = await handleDojoLearn({
      skill: "kungfu"
    });

    expect(response.isError).toBeUndefined();
    expect(response.content[0].text).toContain("I know kung fu! 🥋");
    expect(response.content[0].text).toContain("Installed @community/kungfu to:");
    expect(response.content[0].text).toContain("• .claude/skills/kungfu.md");
    expect(response.content[0].text).toContain("• .agent/workflows/kungfu.md");
    expect(response.content[0].text).toContain("• .cursor/rules/kungfu/RULE.md");
  });

  it('should return error message on failure', async () => {
    const mockResult = {
      success: false,
      message: 'Skill not found',
      installedPaths: []
    };
    
    (installLib.installSkill as any).mockResolvedValue(mockResult);

    const response = await handleDojoLearn({
      skill: "unknown"
    });

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("❌ Skill not found");
  });
});
