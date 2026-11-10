// Simple rule-based extraction for the demo. No AI call, runs in the browser.
export type Extracted = {
  decisions: string[];
  risks: string[];
  owners: string[];
  tasks: string[];
};

const RULES: Record<keyof Extracted, RegExp> = {
  decisions:
    /\b(decided|decision|went with|chose|choose|agreed|switched to)\b/i,
  risks:
    /\b(blocked|risk|no backup|fails?|failed|failing|single point|unmonitored|legal)\b/i,
  owners: /\b(owns?|owner|responsible for|in charge of|handles?)\b/i,
  tasks:
    /\b(todo|to-do|need to|needs to|don['’]?t forget|should|must|remember to|follow up)\b/i,
};

export function ruleExtract(text: string): Extracted {
  const out: Extracted = { decisions: [], risks: [], owners: [], tasks: [] };
  const sentences = text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  for (const s of sentences) {
    (Object.keys(RULES) as (keyof Extracted)[]).forEach((key) => {
      if (RULES[key].test(s) && !out[key].includes(s)) out[key].push(s);
    });
  }
  return out;
}
