export const ROLES = [
  "Frontend",
  "Backend",
  "Fullstack",
  "AI / ML",
  "Design / UI",
  "Product",
  "Growth",
  "Founding Engineer",
  "Solidity / Web3",
  "DevOps / Infra",
  "Security",
  "Protocol R&D",
] as const;

export type Role = (typeof ROLES)[number];

const BUILDER_CLASS_PATTERNS = [
  "CHIEF {role} OFFICER",
  "{role} TERMINAL WIZARD",
  "LEAD {role} ARCHITECT",
  "KERNEL {role} ALCHEMIST",
  "PRINCIPAL {role} SHIPPER",
  "{role} CODE SORCERER",
  "FOUNDING {role} CRAFTSPERSON",
  "VIBE & {role} LEAD",
  "GOA {role} PIONEER",
  "DEEP TECH {role} MAESTRO",
  "SHADOW {role} BUILDER",
  "SIGNAL OVER NOISE — {role}",
];

export function getRandomTitle(role: string, currentTitle?: string): string {
  const cleanRole = (role || "BUILDER").toUpperCase();
  const choices = BUILDER_CLASS_PATTERNS.map((pattern) =>
    pattern.replace("{role}", cleanRole)
  );

  const available = choices.filter((c) => c !== currentTitle);
  const pool = available.length > 0 ? available : choices;

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}
