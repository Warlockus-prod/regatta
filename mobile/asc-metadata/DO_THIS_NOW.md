# Что делать вам, по шагам

## Что я уже сделал автоматом

App Store Connect через API уже заполнен на ~95%:

- [x] Build 13 (0.13.0) в TestFlight Internal Testing, привязан к Self group.
- [x] **Metadata 7 локалей** (name / subtitle / description / keywords /
      promotional / support_url / marketing_url) - `node scripts/asc-metadata.mjs`,
      0 diff'ов.
- [x] **Primary Category** = Education, **Secondary** = Sports.
- [x] **Content Rights** = "Does not use third-party content".
- [x] **Age Rating** = 4+ (все 24 поля = NONE / false).
- [x] **Pricing** = Free, baseTerritory USA, авто-распространение на все рынки.
- [x] **Privacy Policy URL** = `https://regatta.icoffio.com/privacy` на всех
      7 локализациях.
- [x] **Privacy Policy текст** готов в [PRIVACY_POLICY.md](./PRIVACY_POLICY.md).

Все эти настройки идемпотентны - запустите `node scripts/asc-bootstrap.mjs`
или `--dry-run` чтобы проверить состояние в любой момент.

## Что осталось вам - 3 шага

### Шаг 1 - выложить Privacy Policy на сайт (5 минут)

Apple Review проверяет что URL `https://regatta.icoffio.com/privacy`
открывается без логина и возвращает читаемый текст.

Самый быстрый способ - создайте страницу в web лейне (Next.js):

1. Скопируйте содержимое [PRIVACY_POLICY.md](./PRIVACY_POLICY.md).
2. Создайте файл `src/app/privacy/page.tsx` в web проекте (Shared лейн).
3. Поместите туда `<article className="prose">...</article>` с этим текстом.
4. Push -> CI deploy через GitHub Actions -> URL станет доступен.

Если деплой долго - можно временно положить на любую сабдомейн вашего
сайта, главное чтобы открылось без логина и не 404'ило. URL уже привязан
в ASC, менять не надо.

### Шаг 2 - снять 5 screenshots с реального iPhone

Apple требует screenshots по 5 штук для каждого размера (6.7" + 6.5").
Минимум - на одном языке (EN). Идеал - на всех 7.

**Самый простой способ - на вашем iPhone через TestFlight:**

1. Откройте Week to Regatta в TestFlight.
2. Сделайте 5 скриншотов (Volume Up + Side button одновременно):
   - **Frame 1** - **Home** с Continue Day N (сначала откройте хотя бы
     один урок Bootcamp чтобы появился Continue).
   - **Frame 2** - **Bootcamp** index с Day-N разделителями.
   - **Frame 3** - **Simulator** (Top view) с яхтой + ветром + sliders.
   - **Frame 4** - **Anatomy** с фото-яхтой + hotspots.
   - **Frame 5** - **Pre-race Checklist** с прогресс-баром.
3. Скриншоты автоматом в Photos. Через iCloud sync они появятся на Mac
   в приложении Photos.
4. Выгрузите 5 PNG.

В ASC web UI - страница версии 1.0:
https://appstoreconnect.apple.com/apps/6768134329/distribution/version/1.0

В разделе "App Previews and Screenshots":
- "iPhone 6.7" Display" -> drag-drop 5 PNG.
- "iPhone 6.5" Display" -> drag-drop 5 PNG (можно те же если у вас
  iPhone 16 Pro Max, Apple это примёт).
- Если делаете на нескольких языках - переключите Language в выпадающем
  меню сверху страницы.

### Шаг 3 - Submit for Review

После того как screenshots загружены, на той же странице 1.0:

1. Привязать Build: в разделе "Build" нажмите **+** -> выберите
   **0.13.0 (13)** (или новее).
2. Прокрутите вниз до "General App Information":
   - **Copyright**: `2026 icoffio`
   - **Sign-In Required**: галочка **Sign-in is not required**.
   - **Contact Information**: ваше имя + `andrlock@gmail.com` + телефон.
   - **Notes for Review** - скопируйте этот текст:

```
Week to Regatta is a sailing tutor app aimed at people preparing for
their first regatta within a week. The 7-day Bootcamp arc walks the
user from wind basics to mini-race rules. The Simulator uses a real
VPP physics engine with adjustable sail trim, wind direction, and
three drill modes (TWA hold, no-go avoidance, gust trim). The Anatomy
screen has tap-able hotspots over a photo yacht. The Pre-race
Checklist persists tick state locally.

No sign-in is required. All data is stored locally on the device via
AsyncStorage. There are no analytics SDKs, no third-party trackers,
no advertising identifier. The Multiplayer feature in this version is
local practice with simulated ghost boats; real network multiplayer
ships in a later version.

Test account: not required.
```

3. Нажмите **Add for Review** или **Submit for Review** в правом
   верхнем углу.
4. Apple задаст 3 финальных вопроса - все **No**:
   - Encryption -> No
   - Third-party content -> No
   - Advertising Identifier -> No
5. **Submit**.

Статус: **Waiting for Review**. Apple обычно отвечает 24-48 часов.

## После одобрения

Email "Your app has been approved":
- Если на странице 1.0 выбран **Manual Release** - надо нажать
  **Release this version**.
- Если **Automatic Release** - выйдет автоматом.

После релиза: https://apps.apple.com/app/id6768134329 будет открываться.

## Если что-то сломалось

Запустите `node scripts/asc-bootstrap.mjs --dry-run` - покажет что
именно не в синхроне сейчас. Без `--dry-run` починит автоматом.

## Полезные ссылки

- App Store Connect:
  https://appstoreconnect.apple.com/apps/6768134329/distribution
- Версия 1.0 (где привязать build + загрузить screenshots):
  https://appstoreconnect.apple.com/apps/6768134329/distribution/version/1.0
- App Privacy (уже сконфигурировано через API, но можно проверить):
  https://appstoreconnect.apple.com/apps/6768134329/distribution/privacy
- Pricing & Availability (уже сконфигурировано):
  https://appstoreconnect.apple.com/apps/6768134329/distribution/pricing

## Чеклист в одну строку

- [ ] Privacy Policy опубликован на `https://regatta.icoffio.com/privacy`
- [ ] 5 screenshots с iPhone загружены в ASC (6.7" + 6.5")
- [ ] Build 0.13.0(13) привязан + Copyright + Contact + Notes for Review
- [ ] Submit for Review (3 No)
- [ ] Через 24-48ч email от Apple
