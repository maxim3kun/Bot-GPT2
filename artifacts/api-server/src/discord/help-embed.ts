import { EmbedBuilder } from "discord.js";
import { splitAiAnswer } from "./ai-answer-format.js";

export const HELP_PREFIX_TOKEN = "{{command-prefix}}";

/** Topic guides must respect Discord's per-field limit in every translation. */
export class HelpEmbedBuilder extends EmbedBuilder {
  private compact = false;
  private commandPrefix = "!";
  setCommandPrefix(prefix: string): this { this.commandPrefix = prefix; return this; }
  setCompact(): this { this.compact = true; return this; }
  private render(text: string): string {
    // Expand legacy examples first and explicit placeholders last, exactly once.
    return text.replaceAll("`!", `\`${this.commandPrefix}`).replaceAll(HELP_PREFIX_TOKEN, this.commandPrefix);
  }
  override setDescription(description: Parameters<EmbedBuilder["setDescription"]>[0]): this {
    return super.setDescription(description == null ? null : this.render(description));
  }
  override setTitle(title: Parameters<EmbedBuilder["setTitle"]>[0]): this {
    return super.setTitle(title == null ? null : this.render(title));
  }
  override setFooter(footer: Parameters<EmbedBuilder["setFooter"]>[0]): this {
    return super.setFooter(footer ? { ...footer, text: this.render(footer.text) } : null);
  }
  override addFields(...fields: Parameters<EmbedBuilder["addFields"]>): this {
    const bounded = fields.flat().flatMap((original) => {
      const field = { ...original, name: this.render(original.name), value: this.render(original.value) };
      return splitAiAnswer(
      this.compact ? field.value.split("\n").filter((line) => !line.trim().startsWith(">")).join("\n") : field.value,
      1_000,
    ).map((value, index) => ({
      ...field, name: `${field.name.slice(0, 240)}${index ? ` (${index + 1})` : ""}`, value,
    }));
    });
    return super.addFields(...bounded);
  }
}
