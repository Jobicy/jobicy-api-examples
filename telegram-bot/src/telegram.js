const TELEGRAM_TIMEOUT_MS = 15_000;

export async function sendTelegramMessage({ token, chatId, message }) {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("TELEGRAM_BOT_TOKEN does not match the expected BotFather token format");
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true }
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS)
    });
  } catch (error) {
    throw new Error(`Telegram request failed: ${error.message}`);
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error(`Telegram returned a non-JSON response with HTTP ${response.status}`);
  }

  if (!response.ok || payload.ok !== true) {
    throw new Error(`Telegram rejected the message: ${payload.description || `HTTP ${response.status}`}`);
  }

  return payload.result;
}
