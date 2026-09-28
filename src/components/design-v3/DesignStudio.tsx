'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { menuGroups } from "@/lib/product/menu";
import styles from "./DesignStudio.module.css";

const screens = [
  ["home", "01", "Главная"], ["lesson", "02", "Урок и схема"],
  ["anatomy", "03", "Устройство яхты"], ["practice", "04", "Практика"],
  ["menu", "05", "Всё меню"], ["assets", "06", "Изображения"],
  ["plan", "07", "План внедрения"],
] as const;
type Screen = typeof screens[number][0];
const passports: Record<Screen, [string, string][]> = {
  home: [["Источник", "Regatta v3.dc.html: фото, тёплый фон, один следующий шаг."], ["Адаптация", "Нет фиктивных часов и процентов навыка. В рабочей главной остаётся настоящий локальный прогресс."], ["Сайт", "Широкая композиция, верхнее меню, отдельный вход в курс."], ["Приложение", "Короткая главная, пять нижних вкладок. Последняя всегда «Меню». Светлая оболочка пока концепт, не новая нативная тема."]],
  lesson: [["Цикл", "Объяснение → схема → действие → практика → проверка."], ["Честная обратная связь", "Схема не вычисляет скорость яхты и не ставит оценку за практику. Здесь демонстрация UI, она не пишет в прогресс курса."], ["Следующий этап", "Перенести оболочку на настоящие уроки и сохранять точный шаг при выходе в тренажёр."]],
  anatomy: [["Сейчас", "Фото из вашего экспорта, интерактивные метки и отдельная схема подводной части."], ["Не 3D", "На фото нельзя вращать яхту. Метки привязаны к исходным пропорциям снимка."], ["Blender", "Отдельные объекты снастей, точки вращения, UV, материалы и три уровня детализации."]],
  practice: [["Принцип", "Один учебный путь и общая физика. Простота или глубина управления выбираются внутри занятия."], ["Сейчас", "Ссылки открывают существующие тренажёры. Красивый рендер не подменяет их сцену."], ["Дальше", "Единая оболочка запуска, затем камеры и такелаж. Не объединять движки до проверки регрессий."]],
  menu: [["Всегда всё", "Директория из действующего каталога приложения, а не только справочник или настройки."], ["Поиск", "Клавиатура, пустое состояние, разделение обучения, экзаменов и практики."], ["Навигация", "Реальные ссылки, без кнопок-заглушек."]],
  assets: [["Генерация", "Новый морской фон и самостоятельный мобильный концепт. Не фотографии реального места и не скриншоты релиза."], ["Точность", "Силы, знаки и проводка снастей только проверяемыми схемами и геометрией."], ["Права", "Для фото из экспорта перед публичным релизом подтвердить право использования."]],
  plan: [["Версия", "v3.1, 28 сентября 2026. Этот стенд объединяет направление, решения и этапы."], ["Граница", "Не полный перенос всех экранов HTML и не релиз App Store."], ["Критерий", "Каждый этап заканчивается работающим сценарием, проверкой сохранения прогресса и тестами на телефоне."]],
};
const parts = [
  { id: "mast", title: "Мачта", text: "Опора рангоута. На этой яхте её поддерживает стоячий такелаж.", x: 51, y: 31 },
  { id: "boom", title: "Гик", text: "Балка под гротом. Гика-шкот влияет на положение гика и натяжение задней шкаторины; связь зависит от проводки снастей.", x: 63, y: 60.5 },
  { id: "cockpit", title: "Кокпит", text: "Здесь работает экипаж. Вращение камеры не должно менять положение органов управления.", x: 80, y: 65 },
  { id: "keel", title: "Киль", text: "На этой схеме балластный киль: создаёт боковую гидродинамическую силу и участвует в восстанавливающем моменте. На фотографии он скрыт водой." },
  { id: "rudder", title: "Руль", text: "Перо меняет направление потока воды. Его действие зависит от обтекания, поэтому на малом ходу управляемость снижается." },
] as const;

function WindDiagram({ angle }: { angle: number }) {
  return <svg className={styles.diagram} viewBox="0 0 340 330" role="img" aria-label={`Учебная схема: угол к направлению, откуда дует ветер, ${Math.abs(angle)} градусов`}>
    <defs><marker id="design-wind-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="currentColor" /></marker></defs>
    <g stroke="#006ea6" strokeWidth="2" color="#006ea6" markerEnd="url(#design-wind-arrow)"><path d="M140 8 V40"/><path d="M170 8 V40"/><path d="M200 8 V40"/></g>
    <circle cx="170" cy="177" r="122" fill="#eee9de" stroke="#c7d2d6"/>
    <path d="M170 177 L84 91 A122 122 0 0 1 256 91 Z" fill="#f4d9cb" stroke="#a44a2d" strokeDasharray="4 4"/>
    <path d="M48 177 H292 M170 55 V299" stroke="#bccbd0" strokeDasharray="3 5"/>
    <g fill="#123247" fontSize="12" textAnchor="middle"><text x="170" y="78">Против ветра</text><text x="64" y="166">90°</text><text x="276" y="166">90°</text><text x="170" y="285">По ветру</text></g>
    <g transform={`rotate(${angle} 170 177)`}>
      <path d="M170 126 Q192 150 187 190 L182 214 H158 L153 190 Q148 150 170 126Z" fill="#fbfaf7" stroke="#123247" strokeWidth="2"/>
      <rect x="162" y="183" width="16" height="21" rx="4" fill="#c9a77c"/>
      <path d="M170 143 V179" stroke="#123247" strokeWidth="2"/>
      <path d={Math.abs(angle) < 40 ? "M170 156 Q179 166 170 175 Q161 184 170 194" : `M170 156 Q${angle >= 0 ? 196 : 144} 176 ${angle >= 0 ? 194 : 146} 191 Z`} fill={Math.abs(angle) < 40 ? "none" : "#fbfaf7"} stroke="#006ea6" strokeWidth="2"/>
    </g>
    <text x="170" y="324" textAnchor="middle" fill="#526675" fontSize="12">Условная схема, не поляра конкретной яхты</text>
  </svg>;
}

export default function DesignStudio() {
  const [screen, setScreen] = useState<Screen>("home");
  const [step, setStep] = useState(0);
  const [angle, setAngle] = useState(45);
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [partId, setPartId] = useState<string>("mast");
  const [query, setQuery] = useState("");
  const part = parts.find(p => p.id === partId)!;
  const groups = menuGroups(query, "ru", "web");
  const inTarget = Math.abs(angle) >= 85 && Math.abs(angle) <= 95;
  return <article lang="ru" className={styles.studio}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>WEEK TO REGATTA / DESIGN v3.1</p><h1>Море в кадре.<br/>Ясность в действии.</h1></div>
      <div className={styles.intro}><p>Единый рабочий ориентир: ваш прототип, новые изображения и план переноса в сайт и приложение.</p><Link href="/">Открыть рабочую главную ↗</Link><span>Дизайн-стенд. Не релиз и не запись учебного прогресса.</span></div>
    </header>
    <div className={styles.workspace}>
      <nav className={styles.rail} aria-label="Экраны дизайн-стенда">
        {screens.map(([id, number, title]) => <button key={id} type="button" aria-pressed={screen === id} onClick={() => setScreen(id)}><span>{number}</span>{title}</button>)}
      </nav>
      <section className={styles.stage} aria-label="Предпросмотр выбранного экрана">
        {screen === "home" && <div className={styles.phone}>
          <div className={styles.photo}><Image src="/design-v3/sailing-editorial.webp" alt="" fill sizes="420px" priority/><span>WEEK TO REGATTA</span></div>
          <div className={styles.phoneBody}><p className={styles.eyebrow}>ТВОЙ СЛЕДУЮЩИЙ ШАГ</p><h2>Разобраться.<br/>Попробовать. Запомнить.</h2><p>Короткое объяснение, понятная схема и практика сразу после неё.</p>
            <button className={styles.primary} onClick={() => { setScreen("lesson"); setStep(0); }}>Посмотреть пример урока <span>→</span></button>
            <h3>Выбери направление</h3>
            {[['/start', 'Парусный спорт с нуля'], ['/learn/sails', 'Работа с парусами'], ['/radio', 'Радиосвязь SRC'], ['/sternik', 'Моторный рулевой']].map(([href, title]) => <Link className={styles.row} href={href} key={href}>{title}<span>↗</span></Link>)}
          </div>
          <nav className={styles.tabs} aria-label="Пример навигации приложения">{([['home', 'Главная'], ['lesson', 'Учёба'], ['practice', 'Практика'], ['race', 'Гонка'], ['menu', 'Меню']] as const).map(([id, label]) => id === "race" ? <Link href="/race" key={id}>{label}</Link> : <button key={id} aria-pressed={screen === id} onClick={() => setScreen(id)}>{label}</button>)}</nav>
        </div>}
        {screen === "lesson" && <div className={styles.phone}>
          <div className={styles.lessonTop}><button aria-label="Закрыть пример урока" onClick={() => setScreen("home")}>×</button><strong>Курсы к ветру</strong><span>{step + 1}/3</span></div>
          <div className={styles.phoneBody}><p className={styles.eyebrow}>{["01 / ПОЙМИ", "02 / ПОПРОБУЙ", "03 / ПРОВЕРЬ"][step]}</p>
            <h2>{["Ветер задаёт курс", "Найди галфвинд", "Что означает галфвинд?"][step]}</h2>
            {step < 2 ? <><p>{step === 0 ? "Направление ветра называют по стороне, откуда он дует. На схеме ветер приходит сверху. Галфвинд соответствует примерно 90° к истинному ветру." : "Поверни лодку ползунком. Найди угол около 90° с любой стороны. В настоящем тренажёре отдельно разберём вымпельный ветер."}</p><WindDiagram angle={step === 0 ? 90 : angle}/>
              {step === 1 && <><label className={styles.sliderLabel} htmlFor="heading-angle">Угол лодки <output>{angle}°</output></label><input id="heading-angle" type="range" min="-180" max="180" value={angle} onChange={e => setAngle(Number(e.target.value))}/><p role="status">{inTarget ? "Верно: ветер примерно в борт." : "Цель: 90° или -90°."}</p></>}
              <button className={styles.primary} disabled={step === 1 && !inTarget} onClick={() => setStep(step + 1)}>{step === 0 ? "Попробовать самому" : "Проверить понимание"} →</button>
            </> : <><div className={styles.answers}>{["Ветер примерно в борт", "Ветер прямо с кормы", "Нос прямо на ветер"].map(text => <label key={text}><input type="radio" name="course-answer" value={text} checked={answer === text} onChange={() => { setAnswer(text); setChecked(false); }}/>{text}</label>)}</div>
              <button className={styles.primary} disabled={!answer} onClick={() => setChecked(true)}>Проверить</button>
              {checked && <p role="status" className={styles.feedback}>{answer === "Ветер примерно в борт" ? "Верно. На схеме это угол около 90°. Теперь можно наблюдать связь курса, настройки парусов и движения в тренажёре." : "Попробуй ещё раз. «В борт» означает поперёк лодки, а не с носа или кормы."}</p>}
              {checked && answer === "Ветер примерно в борт" && <Link className={styles.row} href="/simulator-v3">Открыть настоящий тренажёр ↗</Link>}
              <button className={styles.textButton} onClick={() => setStep(1)}>Вернуться к схеме</button>
            </>}
          </div>
        </div>}
        {screen === "anatomy" && <div className={styles.phone}>
          <div className={styles.anatomyPhoto}><Image src="/design-v3/yacht-anatomy-photo.webp" width={1000} height={1778} alt="Яхта на якорной стоянке, паруса убраны" sizes="420px"/>
            {parts.filter(p => "x" in p).map(p => "x" in p && <button key={p.id} className={styles.marker} style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => setPartId(p.id)} aria-pressed={partId === p.id}>{p.title}</button>)}
          </div>
          <div className={styles.phoneBody}><p className={styles.eyebrow}>ФОТО + УЧЕБНАЯ СХЕМА, НЕ 3D</p><div className={styles.chips}>{parts.map(p => <button key={p.id} aria-pressed={partId === p.id} onClick={() => setPartId(p.id)}>{p.title}</button>)}</div><h2>{part.title}</h2><p aria-live="polite">{part.text}</p>
            {(partId === "keel" || partId === "rudder") && <svg viewBox="0 0 300 110" role="img" aria-label="Условный боковой вид корпуса с килем и рулём под ватерлинией"><path d="M15 36 H285 L263 59 Q150 69 35 57Z" fill="#eee9de" stroke="#123247"/><path d="M132 64 L125 102 H156 L159 64Z" fill={partId === "keel" ? "#006ea6" : "#b5c5cc"}/><path d="M247 61 L241 92 H255 L261 59Z" fill={partId === "rudder" ? "#006ea6" : "#b5c5cc"}/><path d="M0 56 H300" stroke="#006d70" strokeDasharray="4 4"/></svg>}
            <Link className={styles.row} href="/anatomy">Открыть раздел устройства яхты ↗</Link>
          </div>
        </div>}
        {screen === "practice" && <div className={styles.phone}><div className={styles.photo}><Image src="/design-v3/sailing-editorial.webp" fill alt="" sizes="420px"/><span>ПРАКТИКА</span></div><div className={styles.phoneBody}><p className={styles.eyebrow}>ОТ ПРОСТОГО К ПОДРОБНОМУ</p><h2>Сначала задача.<br/>Потом настройки.</h2><p>Открываются действующие разделы приложения, не симуляция поверх фотографии.</p>{[["/simulator", "01", "Основы", "Ветер, курсы и повороты."], ["/simulator-v3", "02", "Тренажёр трима", "Одна настройка, наблюдение, объяснение."], ["/simulator2", "03", "Лодка 3D", "Рассмотреть паруса с разных ракурсов."], ["/race", "04", "Гонка", "Применить знания на дистанции."]].map(([href, n, t, d]) => <Link className={styles.practiceRow} key={href} href={href}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div><span>↗</span></Link>)}</div></div>}
        {screen === "menu" && <div className={`${styles.phone} ${styles.menu}`}><div className={styles.phoneBody}><p className={styles.eyebrow}>ВСЕ РАЗДЕЛЫ</p><h2>Меню</h2><label htmlFor="design-menu-search">Найти раздел</label><input id="design-menu-search" type="search" placeholder="Например, паруса или радио" value={query} onChange={e => setQuery(e.target.value)}/><div aria-live="polite">{groups.map(g => <section key={g.id}><h3>{g.title.ru}</h3>{g.entries.map(entry => <Link key={entry.id} className={styles.row} href={entry.web!}>{entry.title.ru}<span>↗</span></Link>)}</section>)}{!groups.length && <p>Ничего не найдено. Попробуй «паруса» или «радио».</p>}</div></div></div>}
        {screen === "assets" && <div className={styles.assetSheet}><p className={styles.eyebrow}>НОВЫЕ МАТЕРИАЛЫ</p><h2>Один визуальный язык</h2><p>Иллюстрация поддерживает атмосферу. Важные подписи, стрелки и значения рисуются кодом, а не запекаются в картинку.</p><figure><Image src="/design-v3/sailing-editorial.webp" width={1440} height={960} alt="Сгенерированная иллюстрация яхты на фоне средиземноморского берега"/><figcaption>AI-иллюстрация для главной. Не определённая географическая локация.</figcaption></figure><figure><Image src="/design-v3/mobile-home-concept.png" width={1024} height={1536} alt="Концепт светлой главной приложения с пятью вкладками"/><figcaption>Отдельный мобильный концепт. Демонстрационные данные, не скриншот приложения.</figcaption></figure></div>}
        {screen === "plan" && <div className={styles.plan}><p className={styles.eyebrow}>ПОРЯДОК РЕАЛИЗАЦИИ</p><h2>Сначала учебный путь.<br/>Затем глубина мира.</h2>{[
          ["01", "Основа и главная", "Сейчас", "Разобран экспорт, создан этот стенд, добавлена новая иллюстрация в web/native главную. Навигация и настоящий прогресс сохранены."],
          ["02", "Один законченный урок", "Следующий этап", "Перенести визуальную оболочку на текущий курс. Точный возврат из практики, ошибки, прерывание и сохранение шага. Затем распространить на остальные уроки."],
          ["03", "Общий запуск практики", "Код", "Цель, уровень сложности и помощь. Базовый и расширенный режимы, не три несвязанных приложения. Сначала обёртка над существующими сценами."],
          ["04", "Учебная яхта", "Blender + код", "Проверить существующие GLB. Доделать лебёдки, стопоры, шкивы, проводку, гик, паруса и точки вращения. Подключить геометрию к текущей модели состояния."],
          ["05", "Море, берег и камеры", "3D + оптимизация", "Корма, кокпит, обзор, сверху. Три уровня графики. Сначала стабильность и читаемые снасти, затем отражения и детали берега."],
          ["06", "Офлайн и выпуск", "Отдельная проверка", "Локальные изображения, модель, уроки, схемы и шрифты. Проверка холодного запуска без сети. После QA: VPS2 и отдельно сборка приложения."],
        ].map(([n, t, status, d]) => <section key={n}><span>{n}</span><div><p className={styles.eyebrow}>{status}</p><h3>{t}</h3><p>{d}</p></div></section>)}<p>AR, открытый мир, реальные карты и новый 3D-мультиплеер не входят в первый перенос дизайна. Они не должны блокировать хороший учебный курс.</p></div>}
      </section>
      <aside className={styles.passport}><p className={styles.eyebrow}>ПАСПОРТ РЕШЕНИЯ</p>{passports[screen].map(([label, text]) => <div key={label}><h3>{label}</h3><p>{text}</p></div>)}<div className={styles.palette} aria-label="Палитра: чернила, море, бирюза, песок, бумага">{["#123247", "#006ea6", "#006d70", "#e9ddc7", "#f7f5f0"].map(color => <span key={color} style={{ backgroundColor: color }}/>)}</div><p>Контент читают при дневном свете и дома. Светлая учебная поверхность; тёмные приборы поверх 3D. Темы рабочего приложения не переключаем принудительно.</p></aside>
    </div>
  </article>;
}
