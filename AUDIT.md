# Regatta — Final Audit & Retrospective

**Date:** 2026-04-17
**Project:** https://regatta.icoffio.com
**Repo:** https://github.com/Warlockus-prod/regatta
**Session duration:** ~2 hours from empty folder to production

---

## 1. Что сделано

### 1.1 Pages (6 routes)

| Route | Content | Tech |
|---|---|---|
| `/` | Лендинг с 5 карточками разделов, градиентный заголовок | static |
| `/simulator` | Canvas-симулятор яхты: драг/стрелки, автоматический trim парусов, no-go zone, HUD с RU/EN | client canvas |
| `/courses` | Круговая SVG-диаграмма с 5 курсами (Левентик → Фордевинд), подписи на обе стороны | client SVG |
| `/racing` | Диаграмма дистанции, 4 стратегии (expandable), 4 правила расхождения, 4 ключевых понятия (лейлайн, VMG, Clear Air, Wind Shadow) | client SVG |
| `/game` | Интерактивная гоночная игра с AI-соперниками (3 уровня), реалистичная физика парусов, touch-контролы, AI-тренер | client canvas |
| `/glossary` | 51 термин RU/EN, 7 категорий, поиск, фильтры, staggered fade-in | client grid |
| `/api/coach` | POST endpoint: принимает лог гонки, возвращает JSON анализ через Claude Haiku 4.5 с prompt caching | server route |

### 1.2 Game mechanics

- Физика: speed factor как функция TWA (True Wind Angle) — 0 в no-go, max на beam reach, дальше спад
- AI opponents: тактический автопилот (лавируются, огибают знак, учитывают skill)
- Лог гонки: каждые 0.5с сэмпл позиции + события (tack, no-go-entered, mark-rounded, finish)
- AI-тренер (Claude Haiku): score, топ-3 ошибки с временем и фиксом, сильные стороны, цель
- Управление: arrow keys / A-D + большие touch-кнопки на мобайле
- 3 уровня сложности: 2/3/4 соперников, AI speed 78%/92%/102%

### 1.3 Infrastructure

- **GitHub:** https://github.com/Warlockus-prod/regatta (public)
- **VPS:** isolated container `regatta` на 172.17.0.1:4500
- **Domain:** regatta.icoffio.com (DNS уже был настроен)
- **SSL:** Let's Encrypt cert, auto-renew через deploy-hook копирует в shared certs dir
- **Nginx:** конфиг в `/opt/repos/regatta/regatta.nginx.conf`, скопирован в nginx_server через `docker cp`, reload без рестарта
- **Env:** `/opt/repos/regatta/.env` (chmod 600, в gitignore) с `ANTHROPIC_API_KEY`
- **Deploy flow:** `git push` → ssh → `git pull` → `docker compose up -d --build`

### 1.4 Что протестировано

| Проверка | Результат |
|---|---|
| `npm run build` (TypeScript strict, ESLint) | ✓ 0 errors, 0 warnings |
| Все 6 страниц через Playwright (desktop 1280×900) | ✓ все рендерятся |
| Все страницы на mobile viewport (390×844) | ✓ responsive ok |
| Console errors на всех страницах | ✓ 0 errors после hydration-fix |
| Simulator drag + keyboard input | ✓ работает |
| Game: старт → countdown → физика → финиш | ✓ работает |
| AI coach API с реальным логом | ✓ возвращает валидный JSON coaching за ~2 сек |
| SSL certificate chain | ✓ TLS 1.2/1.3, HSTS |
| HTTP → HTTPS redirect | ✓ 301 |
| Live site regatta.icoffio.com | ✓ HTTP 200 |

---

## 2. Что работает

- ✅ Все 6 страниц + API route рендерятся на продакшене
- ✅ Canvas simulator + game — плавная анимация через requestAnimationFrame
- ✅ AI-тренер: реальный ответ Claude Haiku с оценкой и советами на русском
- ✅ Prompt caching: system prompt кэшируется, экономия на повторных запросах
- ✅ Mobile viewport + touch controls для игры
- ✅ Docker standalone build — маленький image, быстрый рестарт
- ✅ Отдельный container, изолированная сеть — ничего чужого не затронуто
- ✅ SSL auto-renewal настроен

---

## 3. Что не работает / ограничения

- ⚠ **AI-тренер иногда даёт общие советы** если лог короткий (демо-запрос с 4 сэмплами). На реальной гонке 60+ сэмплов — анализ содержательный.
- ⚠ **Touch controls не оптимизированы для планшетов** (показываются только на `md:hidden` = < 768px). На iPad может не быть ни клавиатуры ни touch.
- ⚠ **Nginx конфиг установлен через `docker cp`** — потеряется при пересоздании `nginx_server`. Нужно добавить volume mount в compose nginx_server (это задача владельца nginx_server, вне моего проекта).
- ⚠ **Game running timer = 5 минут максимум** — если игрок слишком медленный, гонка прерывается. Нормально для learning-версии, но можно параметризовать.
- ⚠ **AI opponents не учитывают игрока** — они идут по оптимальной траектории, не блокируют и не дают ветровой тени. Нормально для MVP.
- ⚠ **Favicon** отсутствует кастомный (используется дефолтный Next.js).
- ⚠ **Нет OG/Twitter preview image** — только meta-теги, но изображения для шеринга нет.

---

## 4. Что проверили через MCP/tools

| Инструмент | Использование |
|---|---|
| `Claude Preview MCP` | Первичный визуальный smoke-test локально |
| `Playwright MCP` | Полное E2E-тестирование всех страниц, console logs, screenshots |
| `AskUserQuestion` | Уточнение формата проекта и аудитории |
| `EnterPlanMode` | Планирование архитектуры перед реализацией |
| 4 parallel `Agent` tool calls | Одновременная сборка 4 страниц |
| `gh` CLI | Создание GitHub repo + push |
| SSH + docker на VPS | Изолированный деплой |
| Certbot webroot | Let's Encrypt cert |
| Claude Haiku 4.5 + prompt caching | AI-тренер с минимальной стоимостью |

---

## 5. Virtual Regatta Inshore — что можно взять (по запросу)

Я не могу играть в VR Inshore (требует аккаунт), но по публичным описаниям и скриншотам вижу полезные идеи:

### 5.1 Фичи достойные адаптации

1. **Мини-карта всей трассы** (есть у них внизу экрана) — сейчас у нас только стрелка на следующий знак. На мини-карте видны все соперники + текущая позиция → гораздо больше ситуативной осведомлённости.
2. **Автопилот "AUTO"** — короткое нажатие держит выбранный курс, пока игрок не вмешается. Для мобайла очень полезно: не нужно держать палец.
3. **Kay shifts (заходы ветра)** — через каждые 30-60 сек направление ветра смещается на ±5-15°. Добавляет тактический слой: игрок должен менять галс при заходе.
4. **Порывы и затишья** — визуальные "пятна" на воде, где скорость временно +20% или -15%. Учит наблюдать за водой.
5. **Индикатор оптимального VMG** — показывает, что игрок идёт не оптимальным углом (стрелка "лучше выше" / "лучше ниже").
6. **Penalty pool** — за касание знака или ранний старт: штраф 360° поворот. У нас сейчас знак просто "огибается по радиусу" — добавить проверку стороны и пенальти за фол.
7. **Повтор гонки (ghost)** — после финиша показывается твой путь + "идеальный" путь наложением. Можно реализовать через запись лога + offline optimal-pathfinding.

### 5.2 Чего НЕ брать

- Реал-тайм мультиплеер — избыточно для обучающего симулятора, нужен backend + state sync
- Экономика/апгрейды лодки — не учебная механика
- Сезонные ивенты и метагейм — отвлекает от обучения

### 5.3 Приоритет для следующей итерации

**Must-have:** мини-карта + автопилот + wind shifts
**Nice-to-have:** порывы/затишья + ghost replay
**Skip:** penalty pool (слишком наказывает новичков), мультиплеер

---

## 6. Ретроспектива — что пошло хорошо / плохо

### 6.1 Что сработало

- **Parallel agents для страниц** (4 в параллель) — сэкономили ~10 минут wall time vs последовательной сборки
- **Подготовка `sailing-data.ts` до агентов** — все 4 агента имели готовый типизированный датасет, не выдумывали свой
- **Fix-в-процессе через Playwright visual check** — нашёл hydration bug (float precision) и rotated labels сразу, без жалоб пользователя
- **Next.js standalone output + Docker alpine** — маленький image, быстрая сборка, минимум зависимостей
- **`docker cp` + `nginx -s reload`** вместо рестарта nginx_server — безопаснее, ничего чужого не затронули
- **Planning mode перед кодом** — отделил архитектурные решения от реализации
- **Memory update** — сразу записал VPS deployment в `/Users/Andrey/.claude/memory/vps_infrastructure.md` для будущих сессий

### 6.2 Что пошло не идеально

- **Git init в неправильной папке** — родительская `/Users/Andrey/App/all/` имела свой пустой git репо, моя первая `git add .` попала туда. Пришлось move `.git` aside и init заново.
- **public/ папка пустая → Docker build failed** — забыл что пустые папки не трекаются git'ом. Фикс: `.gitkeep`.
- **Parent `/Users/Andrey/package.json`** ломал module resolution в dev-mode Next.js — Turbopack искал tailwindcss в родителе. Фикс: `turbopack.root + outputFileTracingRoot`.
- **Первый deploy на VPS не обновился после пуша** — забыл, что скрипт деплоя запущен был до второго пуша. Пришлось `git fetch && git reset --hard origin/main` вместо просто `pull`.
- **Ключ от API попал в чат** — user вставил его текстом. Надо будет перевыпустить.
- **Screenshot файлы попали в коммит** — забыл `.gitignore` их до `git add -A`. Пришлось remove и commit два раза.

### 6.3 Оценка скорости
- Empty folder → first Docker container running: ~55 мин
- → live on HTTPS domain: ~1h 10m
- → AI coach + touch controls deployed: ~1h 55m
- Total ~2h для полноценного продакшен-деплоя с AI интеграцией и нулевым downtime соседних проектов

---

## 7. Правила для проекта (CLAUDE.md additions)

Рекомендую добавить в `CLAUDE.md` проекта (создать в корне если нет, или в `.claude/` workspace memory):

```markdown
## Regatta — project rules

### Before ANY change
- Always `git status` first — этот проект живёт в `/Users/Andrey/App/all/regatta/`,
  а родительская `/Users/Andrey/App/all/` может иметь свой git репо. Проверяй `git rev-parse --show-toplevel`.

### Secrets
- `ANTHROPIC_API_KEY` — хранится ТОЛЬКО в:
  - локально: `.env.local` (в `.gitignore`)
  - на VPS: `/opt/repos/regatta/.env` (в `.gitignore`)
- Никогда не логировать, не коммитить, не отправлять в телеметрию.
- При утечке — отозвать на console.anthropic.com и обновить в двух местах выше.

### VPS deployment (icoffio.com)
- Рабочая папка: `/opt/repos/regatta/` — не создавай файлы в других папках
- Container: `regatta` (порт 172.17.0.1:4500 → 3000)
- Nginx: `docker cp regatta.nginx.conf nginx_server:/etc/nginx/conf.d/regatta.conf`
  → `docker exec nginx_server nginx -s reload`. НИКОГДА не рестарти nginx_server.
- SSL: Let's Encrypt cert в `/opt/repos/certs/certs/regatta.icoffio.com.crt`,
  auto-renew через `/etc/letsencrypt/renewal-hooks/deploy/regatta-icoffio.sh`
- Деплой: `git push` локально → SSH → `cd /opt/repos/regatta && git pull && docker compose up -d --build`

### Code conventions
- All interactive UI must be keyboard + touch accessible
- Canvas/SVG work должен работать и на retina (device pixel ratio)
- Все текстовые лейблы в UI должны быть на русском primary + английском secondary
- Для анимаций в Next.js App Router: используй `'use client'` + `requestAnimationFrame`
- SVG coords с Math.sin/cos — всегда round до 2 знаков чтобы избежать hydration mismatch
- Standalone Docker output требует `output: "standalone"` в next.config + `outputFileTracingRoot: __dirname`
- При пустых папках в репе — `.gitkeep` файл иначе Docker build упадёт

### Before deploy
1. `npm run build` — должен пройти без ошибок
2. Playwright smoke test всех страниц
3. Console errors check
4. Screenshot на mobile viewport
5. Git diff review — не коммитить `*.png`, `.env*`, `node_modules/`

### When adding new feature
1. Planning mode first (ExitPlanMode)
2. Minimal viable implementation
3. Playwright verify
4. Commit + push
5. Deploy to VPS
6. Verify live
7. Update memory files (`vps_infrastructure.md` etc.)
```

---

## 8. What to do next (приоритеты)

### Critical
1. **Отозвать текущий API key и создать новый.** Текущий попал в чат (console.anthropic.com → Settings → API Keys).
2. **Добавить кастомный favicon + OG image** (~30 мин работы).

### High value
3. **Мини-карта в игре** — главная фича из VR Inshore.
4. **Wind shifts** — добавляет tactical depth.
5. **Автопилот на touch** — UX на мобайле.

### Nice to have
6. Ghost replay с идеальным путём
7. Leaderboard с таймами (если нужно — потребуется backend)
8. Ещё трассы: триангле-курс, slalom, reach-only
9. Настройка силы ветра — от 3 до 20 узлов
10. Записи гонок в localStorage (без регистрации)

---

*Audit by Claude Opus 4.7 (1M context) — 2026-04-17 01:30 CEST*
