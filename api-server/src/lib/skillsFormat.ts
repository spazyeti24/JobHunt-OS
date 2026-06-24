export function formatSkillsBlock(skillsJson: string | null | undefined): string {
  if (!skillsJson) return "";
  try {
    const parsed: Array<{ category: string; skills: string[] }> = JSON.parse(skillsJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return "";
    const lines = parsed
      .filter((g) => g.category && Array.isArray(g.skills) && g.skills.length > 0)
      .map((g) => `- ${g.category}: ${g.skills.join(", ")}`);
    if (lines.length === 0) return "";
    return lines.join("\n");
  } catch {
    return "";
  }
}
