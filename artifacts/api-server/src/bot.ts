        // ── New commands (beta) ───────────────────────────────────────────────
        case "koya": {
          await handleKoyaTestCommand(message, args, guildPrefix);
          break;
        }

        case "new": {
          await handleNewCommand(message, args, guildPrefix);
          break;
        }

        // ── Dictionary ───────────────────────────────────────────────────────
