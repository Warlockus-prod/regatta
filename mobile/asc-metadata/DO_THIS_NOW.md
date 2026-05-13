# Что делать вам, по шагам

Я уже сделал автоматом:

- [x] Залит build 13 (0.13.0) в TestFlight Internal Testing.
- [x] Metadata 7 локалей синхронизирована в App Store Connect через API
      (`node scripts/asc-metadata.mjs` -> 0 diff'ов).
- [x] Privacy Policy текст готов в [PRIVACY_POLICY.md](./PRIVACY_POLICY.md).
- [x] App Store Connect ссылки и тексты подготовлены.
- [x] Notes for Review текст готов (см. ниже шаг 6.6).

Что нужно сделать вам - всё остальное требует ручного клика в ASC web UI
(Apple не разрешает submit через API).

## ШАГ 1 - выложить Privacy Policy на сайт (5 минут)

Нужен публичный URL вида `https://regatta.icoffio.com/privacy`,
доступный без логина. Apple Review это проверяет.

Самый быстрый вариант: скопируйте содержимое
[PRIVACY_POLICY.md](./PRIVACY_POLICY.md) в новую страницу на
regatta.icoffio.com. Если у сайта Next.js (web лейн), создайте
`src/app/privacy/page.tsx` с этим текстом, deploy.

Если деплой долго - временно положите на icoffio.com (любой ваш сайт),
например `https://icoffio.com/regatta-privacy`. Главное чтобы открылось
с обычного браузера без логина.

URL потом нужен в Шаге 2.

## ШАГ 2 - залогиниться в App Store Connect

Откройте: https://appstoreconnect.apple.com/apps/6768134329/distribution

Логин `andrlock@gmail.com` + пароль + 2FA на iPhone.

Должны увидеть страницу приложения "Week to Regatta". В левом меню
будут разделы: App Information, App Privacy, Pricing and Availability,
1.0 Prepare for Submission и т.д.

## ШАГ 3 - заполнить App Information

Левое меню -> **App Information**.

Большая часть уже заполнена скриптом, осталось:

- **Privacy Policy URL**: вставьте URL из Шага 1 (например
  `https://regatta.icoffio.com/privacy`).
- **Category**: Primary = **Education**, Secondary = **Sports**.
- **Content Rights**: "Does Your App Contain, Show, or Access
  Third-Party Content?" -> **No**.

Нажмите **Save** в правом верхнем углу.

## ШАГ 4 - App Privacy

Левое меню -> **App Privacy**:
https://appstoreconnect.apple.com/apps/6768134329/distribution/privacy

Нажмите **Get Started** (или **Edit** если уже начинали).

Вопрос: "Do you or your third-party partners collect data from this
app?" -> **No** (мы реально ничего не собираем).

Нажмите **Save**.

## ШАГ 5 - Pricing and Availability

Левое меню -> **Pricing and Availability**.

- **Price Schedule**: **Free** (или ваша цена).
- **Availability**: All countries and regions (или выбрать ваши).

**Save**.

## ШАГ 6 - страница версии 1.0

Левое меню -> в разделе **iOS App** выберите **1.0 Prepare for Submission**.

Прямой URL: https://appstoreconnect.apple.com/apps/6768134329/distribution/version/1.0

### 6.1 Screenshots (самое долгое; делайте сами на iPhone или через Simulator)

Apple требует screenshots для двух размеров: **6.7" Display** (1290 x 2796)
и **6.5" Display** (1284 x 2778). По 5 штук на каждый.

**Самый простой способ - на вашем настоящем iPhone:**

1. Откройте Week to Regatta в TestFlight.
2. Снимите скриншоты (кнопка Volume Up + Side button одновременно):
   - **Frame 1**: главный экран Home (с Continue Day N - сначала пройдите
     1 урок в Bootcamp чтобы появился Continue).
   - **Frame 2**: Bootcamp index с Day-N разделителями.
   - **Frame 3**: Simulator (Top view) с яхтой + ветром + sliders.
   - **Frame 4**: Anatomy с фото-яхтой + hotspots.
   - **Frame 5**: Pre-race Checklist с прогресс-баром.
3. Скриншоты автоматически в Photos. Откройте Photos на Mac (sync через
   iCloud), выгрузите 5 PNG.
4. Если у вас не iPhone Pro Max (6.7"), Apple примёт также 6.5" - снимайте
   на любом современном iPhone.

**Альтернатива - автоматом через Simulator** (требует чтобы dev server
работал):

```
cd /Users/Andrey/App/all/regatta/mobile
npx expo run:ios --device "iPhone 16 Pro Max"
# Когда приложение запустилось:
node scripts/asc-screenshots.mjs --device iphone-6.7 --lang en
# Скрипт спросит подтверждение перед каждой локалью.
# PNG сохранятся в mobile/asc-metadata/screenshots/iphone-6.7/en/
```

Для остальных 6 языков переключите язык в Settings приложения на iPhone и
снимите ещё раз. Apple минимум: только EN. Идеально - все 7.

После того как PNG готовы, в ASC web UI на странице 1.0:
1. В разделе "App Previews and Screenshots" -> "iPhone 6.7" Display"
   нажмите **Choose File** или drag-drop 5 PNG.
2. Аналогично "iPhone 6.5" Display".
3. Если делаете несколько локалей - в выпадающем "Language" сверху
   страницы переключите и загрузите для каждой.

### 6.2 Promotional Text / Description / Keywords / URLs

Уже заполнены скриптом! Проверьте что в EN-версии написано:
- **Promotional Text**: "A calm sailing tutor in your pocket..."
- **Description**: длинный текст про 7-day arc, Bootcamp, Simulator etc.
- **Keywords**: `sailing,regatta,yacht,race,wind,tactics,bootcamp,...`
- **Marketing URL**: `https://regatta.icoffio.com`
- **Support URL**: `https://regatta.icoffio.com/support` (нужен тоже -
  можно сделать в один редирект на mailto:support@icoffio.com или на
  главную regatta.icoffio.com).

В выпадающем "Language" проверьте каждую из 7 локалей.

### 6.3 Build

В разделе **Build** на той же странице:
1. Нажмите **+** (плюс) рядом с заголовком Build.
2. Выберите **0.13.0 (13)** или последний доступный.
3. Если build не появляется - подождите 5-10 минут, ASC обрабатывает.

### 6.4 General App Information

- **Copyright**: `2026 icoffio`
- **Routing App Coverage File**: пропустите.
- **Sign-In Information**: галочка **Sign-in is not required**.
- **Contact Information**: ваше имя + email `andrlock@gmail.com` +
  телефон.
- **Notes for Review** - скопируйте этот текст:

  ```
  Week to Regatta is a sailing tutor app aimed at people preparing for
  their first regatta within a week. The 7-day Bootcamp arc walks the
  user from wind basics to mini-race rules. The Simulator uses a real
  VPP physics engine with adjustable sail trim, wind direction, and
  three drill modes (TWA hold, no-go avoidance, gust trim). The
  Anatomy screen has tap-able hotspots over a photo yacht. The
  Pre-race Checklist persists tick state locally.

  No sign-in is required. All data is stored locally on the device
  via AsyncStorage. There are no analytics SDKs, no third-party
  trackers, no advertising identifier. The Multiplayer feature in
  this version is local practice with simulated ghost boats; real
  network multiplayer ships in a later version.

  Test account: not required.
  ```

### 6.5 Age Rating

Левое меню -> **App Information** -> прокрутите до **Age Rating** ->
**Edit**.

Все ответы - **None** или **No**:
- Cartoon or Fantasy Violence: None
- Realistic Violence: None
- Sexual Content: None
- Profanity or Crude Humor: None
- Mature/Suggestive Themes: None
- Horror/Fear Themes: None
- Medical/Treatment Information: None
- Alcohol/Tobacco/Drugs: None
- Simulated Gambling: None
- Contests: None
- Unrestricted Web Access: **No**

Получите **4+ Made for Everyone**. **Save**.

## ШАГ 7 - Submit for Review

Когда все секции на странице 1.0 зеленые (нет красных warning'ов
сверху страницы):

1. Нажмите **Add for Review** или **Submit for Review** (правый верхний
   угол).
2. Apple задаст 3 финальных вопроса:
   - **Export Compliance**: "Does your app use encryption?" -> **No**
     (мы это уже отметили в TestFlight для каждого build).
   - **Content Rights**: "Does your app contain third-party content?"
     -> **No**.
   - **Advertising Identifier**: "Does this app use the Advertising
     Identifier?" -> **No**.
3. **Submit**.

Статус приложения: **Waiting for Review**.

Apple review обычно 24-48 часов. Получите email с результатом.

## ШАГ 8 - после одобрения

Email "Your app has been approved":

- Если на странице 1.0 выбрали **Manual Release** - нужно нажать
  **Release this version**.
- Если **Automatic Release** - выйдет в App Store автоматически.

После релиза приложение доступно по
https://apps.apple.com/app/id6768134329 на любой стране где доступно
по Шагу 5.

## Если Apple отклонил

Email от Apple Review с указанием что не так. Самые частые причины:

- **"App crashes on launch"**: Apple запускает на симе или iPhone у
  ревьюера. Если у нас в TestFlight всё работало - reply через
  Resolution Center с видео что у нас работает.
- **"Privacy Policy URL not accessible"**: проверьте что URL из Шага 1
  открывается в incognito без логина.
- **"Missing screenshots"**: ASC не показал что вы загрузили; пере-загрузите.
- **"Metadata mismatch with app"**: если описание упоминает фичу
  которой нет в build (например вы написали "real WS multiplayer" а в
  build только ghost boats) - перепишите description.

Resolution Center: https://appstoreconnect.apple.com/apps/6768134329/messages

## Полезные ссылки одним списком

- App Store Connect:
  https://appstoreconnect.apple.com/apps/6768134329/distribution
- App Privacy:
  https://appstoreconnect.apple.com/apps/6768134329/distribution/privacy
- 1.0 версия:
  https://appstoreconnect.apple.com/apps/6768134329/distribution/version/1.0
- Apple Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Resolution Center:
  https://appstoreconnect.apple.com/apps/6768134329/messages

## Чеклист в одном месте

- [ ] Privacy Policy URL опубликован
- [ ] App Information: Privacy URL, Category Education+Sports, Content Rights No
- [ ] App Privacy: "No data collection"
- [ ] Pricing: Free + регионы
- [ ] 1.0 Screenshots для 6.7" и 6.5" (минимум 5 EN)
- [ ] 1.0 Build = 0.13.0 (13)
- [ ] 1.0 Copyright + Sign-in not required + Contact + Notes for Review
- [ ] Age Rating = 4+
- [ ] Submit for Review (3 No на финальных вопросах)
- [ ] Через 24-48ч ждать email от Apple

Если зашлите на review и вернётся отказ - пришлите мне email от Apple,
быстро починим и пере-submit'нем.
