# Telegram delivery proof v1

The backend sends one technical startup proof only after both the Telegram bot token and private channel are resolved. The message is explicitly fail-closed (`NO JUGAR · 0 €`) and does not alter any wagering gate.

Delivery status is exposed through `/health` as `telegramDeliveryVerified` and `telegramDeliveryProof` without revealing the bot token or chat id.
