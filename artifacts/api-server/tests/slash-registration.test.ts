import assert from "node:assert/strict";
import test from "node:test";
import {
  ApplicationCommandType,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import { mergePrimaryEntryPointCommand, SLASH_COMMANDS } from "../src/discord/slash.js";

const localCommands: RESTPostAPIApplicationCommandsJSONBody[] = [
  {
    name: "help",
    description: "Show help",
    type: ApplicationCommandType.ChatInput,
  },
];

test("crypto command offers private simulation actions and a fixed asset list", () => {
  const crypto = SLASH_COMMANDS.find(command => command.name === "crypto");
  assert.ok(crypto);
  assert.deepEqual(crypto.options?.map(option => option.name), ["demarrer", "solde", "reinitialiser", "strategie"]);
  const start = crypto.options?.find(option => option.name === "demarrer");
  assert.deepEqual(start?.options?.[0]?.choices?.map(choice => choice.value), ["btc", "eth", "sol"]);
  const strategy = crypto.options?.find(option => option.name === "strategie");
  assert.deepEqual(strategy?.options?.[0]?.choices?.map(choice => choice.value), ["btc", "eth", "sol"]);
  assert.equal(strategy?.options?.[1]?.name, "frais_pct");
});

test("bulk overwrite preserves the existing Activity Entry Point", () => {
  const result = mergePrimaryEntryPointCommand(localCommands, [
    {
      id: "entry-point-id",
      application_id: "application-id",
      version: "command-version",
      name: "launch",
      type: ApplicationCommandType.PrimaryEntryPoint,
      description: "",
      handler: 1,
      integration_types: [0, 1],
      contexts: [0, 1, 2],
    },
    {
      id: "old-help-id",
      name: "old-help",
      type: ApplicationCommandType.ChatInput,
    },
  ]);

  assert.equal(result.length, 2);
  assert.deepEqual(result[0], localCommands[0]);
  assert.deepEqual(result[1], {
    name: "launch",
    type: ApplicationCommandType.PrimaryEntryPoint,
    description: "",
    handler: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  });
});

test("bulk overwrite stays unchanged when no Activity Entry Point exists", () => {
  assert.deepEqual(
    mergePrimaryEntryPointCommand(localCommands, [
      { name: "old-help", type: ApplicationCommandType.ChatInput },
    ]),
    localCommands,
  );
});

test("an invalid remote Entry Point fails closed instead of deleting it", () => {
  assert.throws(
    () => mergePrimaryEntryPointCommand(localCommands, [
      { type: ApplicationCommandType.PrimaryEntryPoint },
    ]),
    /invalid Activity Entry Point/i,
  );
});
