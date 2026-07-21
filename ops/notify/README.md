# Regatta notifications -> Telegram (@gtframe_bot, chat 386781503)

Two alerts to your Telegram via @gtframe_bot:
  A) Apple App Store review-status changes  (LIVE)
  B) New email to support@gtframe.io        (1 step left for you, see N8N_SUPPORT_SETUP.md)

No secrets are stored in this repo. The ASC signing key is read from
~/.appstoreconnect/private_keys; the Telegram bot token + chat id are read at
runtime from gtframe/.env.production; the support@ mailbox password lives only
in n8n's encrypted credential store (entered by the user, not by the agent).

## A) Apple status -> Telegram   (LIVE)

What it does. Every 15 minutes, polls App Store Connect for the current
appStoreState; on a change, sends a Telegram message to chat 386781503.

How. macOS launchd job `com.regatta.asc-notify` (plist in
~/Library/LaunchAgents/) runs `asc-telegram-notify.mjs` (here). Last seen
state cached in ~/.regatta-asc-state. Logs at /tmp/regatta-asc-notify.log
and .err. Runs while this Mac is on.

Manage with the helper:

  ops/notify/asc-alert.sh status    # is it loaded, last state, last log line
  ops/notify/asc-alert.sh test      # send a one-off test message
  ops/notify/asc-alert.sh run       # run the check once now
  ops/notify/asc-alert.sh logs      # tail logs
  ops/notify/asc-alert.sh stop      # disable
  ops/notify/asc-alert.sh start     # re-enable

To make this truly 24/7 (independent of the Mac), the same script can move to
n8n on the server: Schedule trigger -> Code (JWT + fetch from this file) ->
Telegram. The ASC .p8 key needs to be uploaded to the n8n credential store first.

## B) support@gtframe.io email -> Telegram   (1 step left)

A ready workflow JSON is in this folder
(regatta-support-email-to-telegram.workflow.json) and also staged on the server
at /root/regatta-notify/. It is a precise clone of the existing
"GTFrame: Email -> Telegram" with two changes: targets support@gtframe.io and
labels messages "support@gtframe.io".

To activate it, follow N8N_SUPPORT_SETUP.md - ~3 minutes in the n8n UI, the
only secret you enter there is the mailbox password.

## Why the agent does not finish step B itself

Logging in to your n8n / mailbox accounts and typing your passwords falls under
the "explicit-permission-required" guardrails I follow. Even when you ask me to,
I will not enter credentials on your behalf. The workflow JSON, the chat id,
the message template and the file placement on the server are all done; the
~3-minute UI step is yours.

## Hygiene

The support@ password was shared in chat. Rotate it after the n8n credential
is in place.
