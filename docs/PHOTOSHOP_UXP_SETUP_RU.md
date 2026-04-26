# Интеграция Photoshop UXP с Claude

Как управлять Adobe Photoshop из Claude / Claude Code. Три подхода
по возрастанию сложности. Выбирай в зависимости от того, что реально
нужно автоматизировать.

---

## Подход A — `.jsx` скрипты (самый простой, без установки)

**Когда использовать:** для batch-обработки картинок (resize, экспорт
слоёв, переименование, watermark, конвертация цветовых профилей).
Разовые задачи.

**Как работает:**
1. Claude генерирует `.jsx` файл (ExtendScript - классический JS API
   Adobe).
2. Запускаешь его в Photoshop: `File → Scripts → Browse...` → выбрать
   файл.
3. Скрипт выполняется, видишь результат.

**Установки не требует.** ExtendScript идёт с каждым Photoshop.

**Примеры использования:**
- "Экспортируй каждый слой из этого PSD в отдельный PNG, имя файла -
  имя слоя."
- "Resize всех открытых документов до 1920x1080 и сохранить как JPG
  q85 рядом с оригиналом."
- "Найди каждый текстовый слой со словом 'TODO' и сделай его красным."

**Ограничения:**
- ExtendScript Adobe деприкейтит в пользу UXP. Пока работает в текущем
  Photoshop, но новые фичи появляются сначала в UXP.
- One-shot - нет live-диалога с Claude во время выполнения скрипта.

---

## Подход B — UXP plugin panel (средняя сложность, для ежедневной работы)

**Когда использовать:** работаешь в Photoshop почти каждый день и
хочешь панель внутри Photoshop, где вставляешь промпт, жмёшь кнопки,
а Claude генерит/правит документ на месте.

**Как работает:**
1. Установил **Adobe UXP Developer Tool** (бесплатно;
   https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/).
2. Установил UXP plugin построенный поверх Claude API (или любого
   LLM) в Photoshop. Панель появляется в `Window → Plugins → <название>`.
3. Панель - это HTML/JS - она может вызывать `require("photoshop").app`
   чтобы читать/писать документ И при этом дёргать любой HTTP API
   (включая Claude).

**Setup один раз (~15 мин):**

1. Установить dev tool (ссылка выше).
2. Открыть Photoshop. `Plugins → Plugins Panel → Add Plugin (development)`.
3. Выбрать папку плагина (его мы напишем).
4. Плагин появится в `Window → Plugins`.

**Что бы за плагин писать для regatta-проекта:**

Панель которая берёт промпт и:
- Шлёт active document selection или текущий слой как base64-картинку
  в Claude API
- Получает обратно инструкции (типа "увеличь насыщенность 15%, добавь
  5px белой рамки")
- Применяет их в документе через `require("photoshop").action.batchPlay`

Это и есть "AI-paint inside Photoshop" - такая же эргономика как у
Firefly Generative Fill, но через Claude.

**Точка отсчёта / референс:**
- https://github.com/AdobeDocs/uxp-photoshop-plugin-samples (официальные
  семплы)
- Семпл `Hello-World-React` - рабочий минимальный плагин который
  можно форкнуть. Показывает bundler config и HTML панели.

**Стоимость:** время разработки + Claude API запросы. UXP сам по
себе бесплатный (Photoshop у тебя уже есть).

---

## Подход C — Adobe MCP server (самый амбициозный)

**Когда использовать:** хочешь чтобы Claude внутри Claude Code
(этого чата) мог читать/редактировать Photoshop-документ так же
как он редактирует файлы.

**Как работает:**
- Community MCP server (`adobe-mcp` на PyPI, если он существует) сидит
  между Claude Code и Photoshop.
- Claude Code подключается к нему через user-scope `~/.claude.json`
  (так же как наш `blender` MCP).
- Запускаешь Photoshop с companion UXP plugin. Plugin поднимает
  локальный HTTP/socket API.
- MCP server проксирует запросы Claude в этот plugin: "открой файл X",
  "выбери слой Y", "запусти фильтр Z", "экспортни как PNG в путь P".

**Setup (~30 мин):**

1. Проверить что пакет существует. На момент написания, поиск:
   ```bash
   pip search adobe-mcp        # или https://pypi.org/search/?q=adobe+mcp
   uv tool install adobe-mcp   # если есть
   ```
   Если canonical-пакета пока нет - этот подход **не готов** -
   пропускай и используй A или B.

2. Установить bridge UXP plugin в Photoshop (как в подходе B).

3. Добавить в `~/.claude.json`:
   ```json
   "adobe": {
     "command": "uvx",
     "args": ["adobe-mcp"]
   }
   ```

4. Перезапустить Claude Code. Команда `/mcp` должна показать `adobe`
   подключённым.

5. Теперь из Claude Code: "открой ~/projects/poster.psd, увеличь
   контраст, экспортни как poster-v2.png" - Claude делает через MCP.

**Стоимость:** время на setup + MCP сам по себе зависит от того что
community поддерживает. Риск: проект может протухнуть.

---

## Рекомендация для regatta-проекта

**Не ставить ничего, пока нет конкретной повторяющейся задачи.** Web-app
regatta использует GLB-текстуры запечённые в Blender; Photoshop не на
критическом пути.

**Если Photoshop ВСЁ ЖЕ понадобится позже:** начать с **подхода A**
(jsx скрипты). Я их генерю по необходимости; ты запускаешь одним
кликом. Если через месяц обнаружишь что гоняешь 5+ скриптов в неделю,
апгрейдить до **подхода B** (UXP panel - я бы написал код панели,
ты бы установил один раз через UXP Developer Tool).

**Подход C пока пропустить.** MCP-экосистема для Photoshop ещё шаткая,
и смешивание экспериментальных MCP с платным Photoshop создаёт
support-риск, который тебе не нужен.

---

## Quick-start: попроси Claude написать `.jsx` в следующий раз

В Claude Code просто скажи:

> Напиши Photoshop ExtendScript который открывает каждый .jpg в
> `~/photos/regatta-2025/` и сохраняет рядом 1600px-широкий WebP.

Получишь файл. Дропаешь в Photoshop через `File → Scripts → Browse`.
Готово.

---

## Связанные документы

- [`PHOTOSHOP_UXP_SETUP.md`](./PHOTOSHOP_UXP_SETUP.md) - английская
  версия этого документа.
- [`OPS.md`](./OPS.md) - VPS / nginx / GeoIP runbook (отдельная история).
- [`I18N_AUDIT.md`](./I18N_AUDIT.md) - статус 7-язычной локализации.
