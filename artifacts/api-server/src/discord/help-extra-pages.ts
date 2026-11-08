import type { APIEmbedField } from "discord.js";
import { SLASH_COMMANDS } from "./slash.js";

export const ADMIN_SLASH_COMMANDS = new Set(["welcome", "schedule", "voicechannels", "voicepicker", "prefix", "server", "block", "unblock", "banlist"]);

/** Personas have their own guide; server settings belong only in help admin. */
export function extraHelpPage(_page: number, language: string, prefix: string): { title: string; fields: APIEmbedField[] } {
  const labels: Record<string, string[]> = {
    en: ["Memory & personal settings", "Private memory", "Automatic summaries (opt-in)", "Personal settings"],
    fr: ["Mémoire & réglages personnels", "Mémoire privée", "Résumés automatiques (sur activation)", "Réglages personnels"],
    es: ["Memoria y ajustes personales", "Memoria privada", "Resúmenes automáticos (opcionales)", "Ajustes personales"],
    de: ["Speicher & persönliche Einstellungen", "Privater Speicher", "Automatische Zusammenfassungen (optional)", "Persönliche Einstellungen"],
    pt: ["Memória e configurações pessoais", "Memória privada", "Resumos automáticos (opcionais)", "Configurações pessoais"],
    it: ["Memoria e impostazioni personali", "Memoria privata", "Riepiloghi automatici (facoltativi)", "Impostazioni personali"],
  };
  const l = labels[language] ?? labels.en!;
  const commands = (...items: string[]) => items.map(item => `\`${prefix}${item}\``).join("\n");
  return {
    title: l[0]!,
    fields: [
      { name: l[1]!, value: commands("ai remember <information>", "ai memory", "ai forget <numéro|all>") },
      { name: l[2]!, value: commands("ai memory auto on", "ai memory auto off") },
      { name: l[3]!, value: commands("language <code>", "suggest on|off") },
      { name: "Slash", value: SLASH_COMMANDS.filter(command => !ADMIN_SLASH_COMMANDS.has(command.name)).map(command => `\`/${command.name}\``).join(" · ") },
    ],
  };
}
