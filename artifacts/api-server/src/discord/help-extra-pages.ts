import type { APIEmbedField } from "discord.js";
import { SLASH_COMMANDS } from "./slash.js";

/** Short command lists; detailed usage stays in the topic and persona guides. */
export function extraHelpPage(page: number, language: string, prefix: string): { title: string; fields: APIEmbedField[] } {
  const labels: Record<string, string[]> = {
    en: ["Personas & memory", "Personas", "Private memory", "Automatic summaries (opt-in)", "Administration & slash commands", "Server settings — permissions required", "Diagnostics", "Shared server memory — administrators"],
    fr: ["Personas & mémoire", "Personas", "Mémoire privée", "Résumés automatiques (sur activation)", "Administration & commandes slash", "Réglages du serveur — droits requis", "Diagnostic", "Mémoire commune — administrateurs"],
    es: ["Personas y memoria", "Personas", "Memoria privada", "Resúmenes automáticos (opcionales)", "Administración y comandos slash", "Ajustes del servidor — permisos requeridos", "Diagnóstico", "Memoria compartida — administradores"],
    de: ["Personas & Speicher", "Personas", "Privater Speicher", "Automatische Zusammenfassungen (optional)", "Administration & Slash-Befehle", "Servereinstellungen — Berechtigungen erforderlich", "Diagnose", "Gemeinsamer Speicher — Administratoren"],
    pt: ["Personas e memória", "Personas", "Memória privada", "Resumos automáticos (opcionais)", "Administração e comandos slash", "Configurações — permissões necessárias", "Diagnóstico", "Memória compartilhada — administradores"],
    it: ["Personas e memoria", "Personas", "Memoria privata", "Riepiloghi automatici (facoltativi)", "Amministrazione e comandi slash", "Impostazioni — permessi necessari", "Diagnostica", "Memoria condivisa — amministratori"],
  };
  const l = labels[language] ?? labels.en!;
  const commands = (...items: string[]) => items.map((item) => `\`${prefix}${item}\``).join("\n");
  if (page === 6) return {
    title: l[0]!,
    fields: [
      { name: l[1]!, value: commands("persona help", "persona create <nom> | <description>", "persona generate <description>", "persona list", "persona show <nom>", "persona use <nom> <message>", "persona start <nom>", "persona stop", "persona learn <nom> | <information>", "persona recall", "persona privacy", "persona avatar", "persona delete <nom>") },
      { name: l[2]!, value: commands("ai remember <information>", "ai memory", "ai forget <numéro|all>") },
      { name: l[3]!, value: commands("ai memory auto on", "ai memory auto off") },
    ],
  };
  return {
    title: l[4]!,
    fields: [
      { name: l[5]!, value: commands("prefix <préfixe>", "server language <code>", "voicechannels <id1> <id2>", "suggest on|off", "artist list", "help admin", "help setup") },
      { name: l[6]!, value: commands("tech", "technician", "animation test") },
      { name: l[7]!, value: commands("ai server remember <information>", "ai server forget") },
      { name: "Slash", value: SLASH_COMMANDS.map((command) => `\`/${command.name}\``).join(" · ") },
    ],
  };
}
