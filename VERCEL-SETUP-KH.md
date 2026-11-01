# TeleDrive — Vercel Only (Media Preview)

## Deploy
1. Push this project folder to GitHub and import it into Vercel.
2. In Vercel → Project → Settings → Environment Variables, add `TELEGRAM_BOT_TOKEN` with your bot token (Production, Preview, Development as needed).
3. Redeploy after adding the variable.
4. Open the app and test a small image, MP4, audio, PDF and TXT file.

## Important limits
- Telegram hosted Bot API `getFile` can download files up to 20 MB. Larger files need a Local Bot API Server or another storage/media host.
- Vercel Functions have request/response constraints; this endpoint streams the upstream response rather than buffering it, but Vercel is not intended to be a full media server. Hobby plan duration and bandwidth/usage limits still apply.
- This update moves preview delivery through `/api/telegram-file`. Existing upload and Telegram-management code in this legacy app still uses the browser-configured bot token. Do not use a valuable bot token on a public site until those remaining client-side Telegram calls are also migrated to server functions.
- Revoke any bot token previously pasted into a public URL or shared screenshot and generate a new one with @BotFather.

## Troubleshooting
- `Missing TELEGRAM_BOT_TOKEN`: add the Vercel environment variable and redeploy.
- `Telegram getFile failed`: check bot token, file_id and bot access.
- `404` or unsupported media: confirm the file is still accessible to the bot.
- Files above 20 MB cannot be downloaded using Telegram's hosted Bot API.
