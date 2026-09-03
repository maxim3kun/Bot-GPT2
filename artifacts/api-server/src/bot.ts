⚡ URGENT MODEL FIX REQUIRED

The bot is using "llama-3.1-8b-instant" which doesn't exist on your Groq account.

✅ SOLUTION: Use sed to replace the model everywhere:

sed -i 's/"llama-3.1-8b-instant"/"mixtral-8x7b-32768"/g' artifacts/api-server/src/bot.ts

OR manually find & replace in your editor:
- Find: "llama-3.1-8b-instant"
- Replace: "mixtral-8x7b-32768"

There are ~6 occurrences in bot.ts (lines 289, 312, 335, 1362, 1449, 1599)

After change, commit and Railway will redeploy automatically! 🚀
