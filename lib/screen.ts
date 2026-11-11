// Masks secrets and personal data BEFORE anything is saved or sent to an AI.
// Regex screening is a safety net, not a guarantee.

const MASK = (label: string) => `[REDACTED:${label}]`;

const RULES: {
  label: string;
  re: RegExp;
  replace?: (m: string, ...g: string[]) => string;
}[] = [
  {
    label: "secret",
    re: /\b((?:api[_-]?key|secret|token|passw(?:or)?d|pwd|auth)[\w-]*\s*[:=]\s*)(["']?)[^\s"',;]+\2/gi,
    replace: (_m, key) => `${key}${MASK("secret")}`,
  },
  { label: "token", re: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/g },
  {
    label: "jwt",
    re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  },
  {
    label: "api-key",
    re: /\b(?:sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
  },
  { label: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  // phones: +91 98765 43210, 98765 43210, 9876543210, (415) 555-0123
  {
    label: "phone",
    re: /(?<![\w.])(?:\+\d{1,3}[\s-]?\d{4,5}[\s-]?\d{4,6}|\d{5}[\s-]\d{5}|\d{10}|\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})(?![\w.])/g,
  },
];

export type ScreenResult = { text: string; count: number };

export function screenText(input: string): ScreenResult {
  let text = input;
  let count = 0;
  for (const rule of RULES) {
    text = text.replace(rule.re, (m: string, ...g: string[]) => {
      count += 1;
      return rule.replace ? rule.replace(m, ...g) : MASK(rule.label);
    });
  }
  return { text, count };
}
