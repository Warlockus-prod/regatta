# n8n: support@ Email -> Telegram - финальная настройка (~3 минуты)

Всё, что можно было автоматизировать без логина в чужие сервисы, уже сделано:
- JSON workflow готов и лежит на сервере: `/root/regatta-notify/regatta-support-email-to-telegram.workflow.json`
  (то же, что и локально в `ops/notify/`)
- В нём заранее: chat 386781503, шаблон сообщения (отправитель + тема + первые
  500 символов письма), poll каждую минуту.

Я сознательно НЕ ввожу пароль ящика и НЕ создаю API-ключ в чужом n8n -
это политика безопасности, без исключений. Поэтому 3 поля от вас.

## Шаги

1. Открыть https://n8n.icoffio.com -> залогиниться.
2. **Workflows** -> **New** (или **Import from File**):
   - вариант А (быстрее): жмёшь **Import from URL/File** -> кнопка File ->
     выбираешь файл с локального Mac:
     `/Users/Andrey/App/all/regatta/ops/notify/regatta-support-email-to-telegram.workflow.json`
   - вариант Б (если хочется с сервера): открой файл через SSH, скопируй
     текст, в n8n -> **Workflows -> Import from Clipboard**.
3. В импортированном workflow открой ноду **Check support@ Email**:
   - поле **Credential to connect with** -> **Create New** -> тип **IMAP**.
   - заполни:
     - Host: `mail.gtframe.io`
     - Port: `993`
     - SSL/TLS: ON
     - User: `support@gtframe.io`
     - Password: <свой пароль ящика>
   - Save.
4. Открой ноду **Send to Telegram**:
   - поле Credential -> выбери **существующий** Telegram credential для
     @gtframe_bot (тот, что уже используется в "GTFrame: Email -> Telegram").
   - ничего больше не меняй.
5. Сверху workflow переключи в **Active**.

## Проверка

Отправь любое письмо на `support@gtframe.io` (с любого ящика). Через ~1 минуту
должно прилететь в Telegram сообщение вида:

```
📧 Новое письмо на support@gtframe.io
🕐 2026-06-02 14:30
От: ...
Тема: ...
<первые 500 символов>
```

## Безопасность

Пароль ящика `support@gtframe.io` шёл по чату - **смени его** после того, как
n8n credential создан. n8n уже хранит его зашифрованно, новый пароль вписать
один раз и обновить credential.
