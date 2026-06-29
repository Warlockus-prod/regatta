# Apple App Store Connect: пошаговый гид для public launch

Что я уже сделал автоматически:
- Залил build 11 (0.11.0) в TestFlight Internal Testing.
- Подготовил metadata в 7 языках в `mobile/asc-metadata/<lang>/*` (name, subtitle, description, keywords, promotional, support_url, marketing_url).
- Скрипт `node mobile/scripts/asc-metadata.mjs` готов залить metadata в ASC API одной командой.
- Скрипт `node mobile/scripts/asc-screenshots.mjs` готов снять 5 скриншотов с iOS simulator.

Что должны сделать вы (нельзя без участия человека по политике Apple).

## 0. Apple Developer Account + Apple ID

Что у вас уже есть (проверял раньше):
- Apple Developer Program активен, Team ID `547PA2PLLB`.
- App Store Connect аккаунт `andrlock@gmail.com` с Account Holder ролью.
- App создан: bundle id `com.icoffio.regatta`, Apple ID `6768134329`, name "Week to Regatta".

Если что-то сломалось войдите тут: https://developer.apple.com/account

## 1. Открыть страницу приложения в App Store Connect

Прямая ссылка:

https://appstoreconnect.apple.com/apps/6768134329/distribution

Если просит логин - ваш `andrlock@gmail.com` + пароль + 2FA на iPhone.

## 2. Залить metadata одной командой (опционально, но советую)

Перед заходом в web UI запустите скрипт - он PATCH-нет все 7 локалей через API:

```
cd /Users/Andrey/App/all/regatta/mobile
node scripts/asc-metadata.mjs --dry-run    # сначала dry run, посмотреть что зальётся
node scripts/asc-metadata.mjs              # реальный upload
```

Скрипт выведет какие поля для каких локалей он PATCH-нул. Проверьте что нет ошибок.

После этого в web UI поля будут уже заполнены, останется только дополнить то что нельзя через API (privacy + age + screenshots).

## 3. App Information (один раз на всё приложение)

В левом меню (Sidebar) нажмите **App Information**.

Заполните:
- **Subtitle** (если еще не заполнено скриптом): "Sailing tutor in 7 days"
- **Privacy Policy URL**: https://weektoregatta.com/privacy (или адрес вашей реальной политики; если её нет - быстро создайте страницу на icoffio.com или сделайте mailto)
- **Category**: Primary = **Education**, Secondary = **Sports**
- **Content Rights**: "Does Your App Contain, Show, or Access Third-Party Content?" - **No**

Нажмите **Save** в правом верхнем углу.

## 4. App Privacy (App Store Connect требует)

Прямая ссылка: https://appstoreconnect.apple.com/apps/6768134329/distribution/privacy

Нажмите **Get Started** или **Edit**. Apple задаст вопросы что приложение собирает.

**Ваши ответы (правда, у нас всё локально, нет аналитики):**

1. "Do you or your third-party partners collect data from this app?" - **No**
2. Save.

Это закрывает Privacy раздел. Никакой telemetry, никаких трекеров - честно.

## 5. Pricing and Availability

В sidebar **Pricing and Availability**.

- **Price Schedule**: Free (или ваша цена)
- **Availability**: All countries and regions (или выберите ваши регионы)
- Save.

## 6. iOS App version (1.0)

В sidebar выберите **1.0 Prepare for Submission** (в разделе iOS App).

Тут нужно заполнить:

### 6.1 Screenshots

Прямая ссылка на скриншот-секцию: https://appstoreconnect.apple.com/apps/6768134329/distribution/version/1.0

Apple требует обязательно скриншоты для:
- **6.7" Display** (iPhone 15/16 Pro Max) - 1290 x 2796 px
- **6.5" Display** (iPhone 14/15 Plus) - 1284 x 2778 px

5 скриншотов на каждый размер.

Снимаем автоматически:

```
cd /Users/Andrey/App/all/regatta/mobile
node scripts/asc-screenshots.mjs
```

Скрипт:
1. Поднимет iOS Simulator (iPhone 16 Pro Max + iPhone 16 Plus).
2. Откроет приложение по deep-link.
3. Снимет 5 кадров: Home -> Bootcamp -> Simulator -> Anatomy -> Checklist.
4. Сохранит в `mobile/asc-metadata/screenshots/<device>/<lang>/<NN>-<screen>.png`.

После этого в web UI:
1. В каждом размере (6.7", 6.5") нажмите **Choose File** или drag-drop PNG из папки выше.
2. Загрузите 5 штук.
3. Не забудьте про 7 языков (если хотите все локализованные screenshots) - переключите Language dropdown в верху страницы и повторите загрузку. На минимум для запуска можно сделать только EN.

### 6.2 App Preview (видео) - НЕ обязательно

Можно пропустить.

### 6.3 Description / Keywords / Promotional Text / Marketing URL / Support URL

Если запускали `asc-metadata.mjs` - уже заполнено. Если нет, скопируйте вручную из:
- `mobile/asc-metadata/en/description.md` - в поле Description
- `mobile/asc-metadata/en/keywords.txt` - в Keywords
- `mobile/asc-metadata/en/promotional.txt` - в Promotional Text
- `mobile/asc-metadata/en/marketing_url.txt` - в Marketing URL
- `mobile/asc-metadata/en/support_url.txt` - в Support URL
- Аналогично для каждого из 7 языков (RU/EN/PL/ES/FR/DE/IT) - переключайте Language dropdown.

### 6.4 Build

В разделе **Build** на той же странице 1.0:
1. Нажмите **+** (плюс) рядом с заголовком Build.
2. Выберите последний build (сейчас это **0.11.0 (11)** или новее).
3. Если он не появляется - подождите 5-10 минут (Apple обрабатывает).
4. Save.

### 6.5 General App Information

- **Copyright**: 2026 icoffio
- **Routing App Coverage File**: пропустить
- **Sign-In Information**: если в приложении нужен вход - надо предоставить тестовые credentials. У нас НЕТ обязательного логина, ставим **Sign-in is not required**.
- **Contact Information**: ваше имя + email + телефон. Apple Review будет звонить если вопросы.
- **Notes for Review**: 

  ```
  Week to Regatta is a sailing tutor app. The app is fully usable
  without any sign-in. All data is stored locally on the device. No
  external analytics, no tracking. The Bootcamp is a 7-day learning
  arc, the Simulator is a Skia + VPP physics sandbox with drills and
  missions, the Anatomy screen has interactive yacht hotspots, and
  the Checklist helps the user prepare before a regatta.
  
  Test account: not required.
  ```

Save.

### 6.6 Age Rating

Прямая ссылка: https://appstoreconnect.apple.com/apps/6768134329/distribution/info

В **Age Rating** нажмите **Edit**. Ответы (всё No кроме одного):
- Cartoon or Fantasy Violence: **None**
- Realistic Violence: **None**
- Sexual Content: **None**
- Profanity or Crude Humor: **None**
- Mature/Suggestive Themes: **None**
- Horror/Fear Themes: **None**
- Medical/Treatment Information: **None**
- Alcohol/Tobacco/Drugs: **None**
- Simulated Gambling: **None**
- Contests: **None**
- Unrestricted Web Access: **No**

Получите **4+** (для всех возрастов). Save.

## 7. Submit for Review

Когда все секции на странице 1.0 зеленые (нет красных warnings):

1. В правом верхнем углу нажмите **Add for Review** (или **Submit for Review**).
2. Apple задаст ещё пару вопросов:
   - **Export Compliance**: "Does your app use encryption?" - **No** (мы уже отметили это в TestFlight).
   - **Content Rights**: "Does your app contain third-party content?" - **No**.
   - **Advertising Identifier**: "Does this app use the Advertising Identifier?" - **No**.
3. Submit.

После этого статус становится **Waiting for Review**. Apple обычно ревьюит 24-48 часов. Если они отклоняют - пришлют письмо с указанием что чинить, починим, ре-submit.

## 8. После одобрения

Apple пришлёт email "Your app has been approved". После этого:

- Если выбрали **Manual Release** на странице 1.0 - надо в ASC нажать **Release this version**.
- Если **Automatic Release** - выйдет в App Store автоматически.

Готово. App в App Store, по https://apps.apple.com/app/id6768134329 будет доступен.

## 9. Если App Store Review отклонил

Самые частые причины и фиксы:

- **"App crashes on launch"** - Apple запускает на iPhone, у вас в TestFlight всё работало = 99% не наша проблема, в feedback они приложат скрин/видео. Reply через Resolution Center, пришлите видео что у нас работает.
- **"Privacy Policy URL not accessible"** - проверьте что https://weektoregatta.com/privacy открывается с публичной странички. Если нет - сделайте простой landing.
- **"Missing screenshots"** - запустите `asc-screenshots.mjs` ещё раз, проверьте загруженные размеры.
- **"Metadata mismatch with app"** - если описание упоминает фичу которой нет (например multiplayer был в описании, а в build 11 он placeholder) - уберите упоминания. Я писал copy чтобы упоминать только то что в build.

## Чеклист перед Submit

- [ ] App Information заполнено (Subtitle, Privacy URL, Category Education+Sports)
- [ ] App Privacy: ответы "No data collection"
- [ ] Pricing: Free + регионы выбраны
- [ ] 1.0 страница:
  - [ ] Screenshots для 6.7" и 6.5" (5 на каждый размер минимум на EN, идеально все 7 langs)
  - [ ] Description / Keywords / Promotional Text заполнены (через скрипт или вручную из mobile/asc-metadata/)
  - [ ] Marketing URL + Support URL
  - [ ] Build 0.11.0 (11) выбран
  - [ ] Copyright + Sign-in (not required) + Contact + Notes for Review
  - [ ] Age Rating - 4+ Made for Everyone
- [ ] Submit for Review нажат, ответил на 3 вопроса (Encryption: No, Third-party content: No, IDFA: No)

После submit ждать 24-48 ч.

## Полезные ссылки

- App Store Connect dashboard: https://appstoreconnect.apple.com
- Ваше приложение: https://appstoreconnect.apple.com/apps/6768134329/distribution
- App Privacy: https://appstoreconnect.apple.com/apps/6768134329/distribution/privacy
- Apple Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Resolution Center (если отклонят): https://appstoreconnect.apple.com/apps/6768134329/messages
