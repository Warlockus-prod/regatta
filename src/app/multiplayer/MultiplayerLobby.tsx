'use client';

// M2-8: the two lobby screens of /multiplayer (before a room and inside one),
// split from MultiplayerClient so they render alone in tests. MultiplayerClient
// keeps the socket, the session and the race; these only draw and call back.
// Rules here: a way back to the Race section, "Create lobby" never looks
// disabled (the missing piece is named under it), no text under 14 px, cyan
// only on actions and the selected race setting, the room code shared through
// the system sheet where there is one.

import { useRef } from 'react';
import Link from 'next/link';
import { missions } from '@/data/missions';
import { useI18n } from '@/lib/i18n';
import { sections } from '@/lib/product/catalog';
import type { CreateBlocker, ShareOutcome } from './lobby';

const RACE_SECTION = sections.find(section => section.id === 'race')!;
const FIELD = { background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' } as const;
const PRIMARY = { background: 'var(--accent-cyan)', color: 'var(--accent-ink)' } as const;

export interface LobbyPlayer { id: string; nickname: string; ready: boolean; isBot: boolean; connected: boolean }
export interface LobbyRoom { code: string; hostId: string; myId: string; missionId: string | null; maxPlayers: number }

export function MultiplayerMenu(p: {
  embed: boolean;
  nickname: string; setNickname: (value: string) => void;
  nicknameInvalid: boolean; nicknameHint: string;
  joinCode: string; setJoinCode: (value: string) => void;
  createBlocker: CreateBlocker; connecting: boolean;
  onCreate: () => void; onJoin: () => void; joinDisabled: boolean;
  error: string | null;
}) {
  const { tp, tl, lang } = useI18n();
  const nicknameRef = useRef<HTMLInputElement>(null);
  const createHint = p.connecting
    ? tl({ ru: 'Создаём лобби...', en: 'Creating the lobby...', pl: 'Tworzymy lobby...', es: 'Creando la sala...', fr: 'Création du salon...', de: 'Lobby wird erstellt...', it: 'Creazione della lobby...' })
    : p.createBlocker === 'nickname-empty'
      ? tl({ ru: 'Чтобы создать лобби, введи ник.', en: 'Enter a nickname to create a lobby.', pl: 'Podaj nick, aby utworzyć lobby.', es: 'Escribe un apodo para crear la sala.', fr: 'Entre un pseudo pour créer le salon.', de: 'Gib einen Nickname ein, um eine Lobby zu erstellen.', it: 'Inserisci un nickname per creare la lobby.' })
      : p.createBlocker === 'nickname-invalid'
        ? tl({ ru: 'Поправь ник выше, чтобы создать лобби.', en: 'Fix the nickname above to create a lobby.', pl: 'Popraw nick powyżej, aby utworzyć lobby.', es: 'Corrige el apodo de arriba para crear la sala.', fr: 'Corrige le pseudo ci-dessus pour créer le salon.', de: 'Korrigiere den Nickname oben, um eine Lobby zu erstellen.', it: 'Correggi il nickname qui sopra per creare la lobby.' })
        : p.createBlocker === 'session'
          ? tl({ ru: 'Подключаемся к серверу, секунду.', en: 'Connecting to the server, one moment.', pl: 'Łączymy z serwerem, chwileczkę.', es: 'Conectando con el servidor, un momento.', fr: 'Connexion au serveur, un instant.', de: 'Verbindung zum Server, einen Moment.', it: 'Connessione al server, un attimo.' })
          : null;
  const create = () => {
    if (p.createBlocker === 'nickname-empty' || p.createBlocker === 'nickname-invalid') nicknameRef.current?.focus();
    p.onCreate();
  };
  return (
    <div className="page-enter max-w-lg mx-auto px-4 py-10" data-testid="mp-menu">
      {!p.embed && <Link href={RACE_SECTION.web} data-testid="mp-back-to-race"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <span aria-hidden="true">&larr;</span> {RACE_SECTION.title[lang] ?? RACE_SECTION.title.en}
      </Link>}
      <h1 className="text-3xl font-bold mt-4 mb-2">{tp('Мультиплеер', 'Multiplayer', 'Multiplayer', { es: 'Multijugador', fr: 'Multijoueur', de: 'Mehrspieler', it: 'Multigiocatore' })}</h1>
      <p className="text-base text-[var(--text-secondary)] mb-6">
        {tp(
          'До 10 игроков на одной трассе. Хост создаёт лобби и делится 4-символьным кодом. Можно добавить ботов.',
          'Up to 10 players on one course. The host creates a lobby and shares the 4-character code. Bots can be added.',
          'Do 10 graczy na jednej trasie. Host tworzy lobby i udostępnia 4-znakowy kod. Można dodać boty.',
          {
            es: 'Hasta 10 jugadores en el mismo recorrido. El anfitrión crea una sala y comparte el código de 4 caracteres. Se pueden añadir bots.',
            fr: 'Jusqu\'à 10 joueurs sur le même parcours. L\'hôte crée un salon et partage le code à 4 caractères. Tu peux ajouter des bots.',
            de: 'Bis zu 10 Spieler auf einer Bahn. Der Host erstellt eine Lobby und teilt den 4-stelligen Code. Bots lassen sich hinzufügen.',
            it: 'Fino a 10 giocatori sullo stesso percorso. L\'host crea una lobby e condivide il codice di 4 caratteri. Puoi aggiungere dei bot.',
          },
        )}
      </p>
      <div className="card p-4 mb-4">
        <label htmlFor="mp-nickname" className="text-sm text-[var(--text-secondary)] block mb-1">{tp('Твой ник', 'Your nickname', 'Twój nick', { es: 'Tu apodo', fr: 'Ton pseudo', de: 'Dein Nickname', it: 'Il tuo nickname' })}</label>
        <input
          id="mp-nickname" ref={nicknameRef}
          aria-label={tp("Твой ник", "Your nickname", "Twój nick", { es: "Tu apodo", fr: "Ton pseudo", de: "Dein Nickname", it: "Il tuo nickname" })}
          type="text" value={p.nickname}
          onChange={(e) => p.setNickname(e.target.value)}
          maxLength={20}
          aria-invalid={p.nicknameInvalid || undefined}
          aria-describedby={p.nicknameInvalid ? 'mp-nickname-hint' : undefined}
          className="w-full min-h-11 px-3 py-2 rounded text-base"
          style={FIELD}
          placeholder={tp('Введи ник', 'Enter nickname', 'Podaj nick', { es: 'Escribe un apodo', fr: 'Entre un pseudo', de: 'Nickname eingeben', it: 'Inserisci un nickname' })}
        />
        {p.nicknameInvalid && (
          <p id="mp-nickname-hint" className="text-sm mt-1" style={{ color: 'var(--warning)' }}>
            {p.nicknameHint}
          </p>
        )}
      </div>
      {/* Never disabled and never dimmed: a tap with something missing focuses
          the nickname, and the line below says what is missing. */}
      <button type="button" onClick={create} data-testid="mp-create"
        aria-busy={p.connecting || undefined} aria-describedby={createHint ? 'mp-create-hint' : undefined}
        className="w-full min-h-11 py-3 rounded-lg font-semibold text-base"
        style={PRIMARY}>
        {tp('Создать лобби', 'Create lobby', 'Utwórz lobby', { es: 'Crear sala', fr: 'Créer un salon', de: 'Lobby erstellen', it: 'Crea lobby' })}
      </button>
      <p id="mp-create-hint" role="status" className="min-h-6 mt-1 mb-3 text-sm text-[var(--text-secondary)]">{createHint}</p>
      <div className="card p-4 mb-3">
        <div className="text-sm text-[var(--text-secondary)] mb-2">{tp('Присоединиться по коду', 'Join by code', 'Dołącz z kodem', { es: 'Unirse con un código', fr: 'Rejoindre avec un code', de: 'Mit Code beitreten', it: 'Entra con un codice' })}</div>
        <div className="flex gap-2">
          <input
            type="text" value={p.joinCode}
            onChange={(e) => p.setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
            maxLength={4}
            aria-label={tp("Код комнаты", "Room code", "Kod pokoju", { es: "Código de sala", fr: "Code du salon", de: "Raumcode", it: "Codice stanza" })}
            className="min-h-11 min-w-0 flex-1 px-3 py-2 rounded text-base font-mono text-center tracking-widest"
            style={FIELD}
            placeholder="XXXX"
          />
          <button type="button" onClick={p.onJoin} disabled={p.joinDisabled}
            className="min-h-11 px-4 py-2 rounded-lg text-base font-semibold disabled:opacity-40"
            style={PRIMARY}>
            {tp('Войти', 'Join', 'Dołącz', { es: 'Unirse', fr: 'Rejoindre', de: 'Beitreten', it: 'Entra' })}
          </button>
        </div>
      </div>
      {p.error && (
        <div className="text-sm px-3 py-2 rounded" style={{ background: 'rgba(255,68,68,0.1)', color: 'var(--danger)' }}>
          {p.error}
        </div>
      )}
      <div className="text-sm text-[var(--text-muted)] mt-6 leading-relaxed">
        {tp(
          'При обрыве связи твоё место сохраняется на 20 секунд. Управляй штурвалом, ползунком или стрелками.',
          "Your place is held for 20 seconds if you disconnect. Steer with the wheel, slider or arrow keys.",
          'Po zerwaniu połączenia twoje miejsce czeka 20 sekund. Steruj kołem, suwakiem lub strzałkami.',
          {
            es: 'Si se corta la conexión, tu plaza se guarda 20 segundos. Gobierna con la rueda, el deslizador o las flechas.',
            fr: 'En cas de déconnexion, ta place est gardée 20 secondes. Barre avec la roue, le curseur ou les flèches.',
            de: 'Bei Verbindungsabbruch bleibt dein Platz 20 Sekunden reserviert. Steuere mit dem Rad, dem Regler oder den Pfeiltasten.',
            it: 'Se cade la connessione, il tuo posto resta riservato per 20 secondi. Timona con la ruota, il cursore o le frecce.',
          },
        )}
      </div>
    </div>
  );
}

export function MultiplayerRoom(p: {
  room: LobbyRoom; players: LobbyPlayer[]; colors: readonly string[];
  reconnecting: boolean; error: string | null;
  canShare: boolean; share: ShareOutcome | null; onShare: () => void;
  onLeave: () => void; onPickMission: (missionId: string | null) => void;
  onAddBot: () => void; onRemoveBot: () => void; onStart: () => void; onReady: (ready: boolean) => void;
}) {
  const { tp } = useI18n();
  const { room, players } = p;
  const iAmHost = room.hostId === room.myId;
  const me = players.find((player) => player.id === room.myId);
  const allReady = players.every((player) => player.isBot || (player.connected && (player.id === room.hostId || player.ready)));
  const activeMission = room.missionId ? missions.find((m) => m.id === room.missionId) : null;
  const botCount = players.filter((player) => player.isBot).length;
  const humanCount = players.filter((player) => !player.isBot).length;
  const totalCount = players.length;
  const settingStyle = (selected: boolean) => ({
    borderColor: selected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
    background: selected ? 'var(--bg-card-hover)' : 'transparent',
  });
  const shareLabel = p.share === 'copied'
    ? tp("Ссылка скопирована", "Link copied", "Link skopiowany", { es: "Enlace copiado", fr: "Lien copié", de: "Link kopiert", it: "Link copiato" })
    : p.canShare
      ? tp('Поделиться кодом', 'Share the code', 'Udostępnij kod', { es: 'Compartir el código', fr: 'Partager le code', de: 'Code teilen', it: 'Condividi il codice' })
      : tp('Копировать ссылку', 'Copy link', 'Kopiuj link', { es: 'Copiar enlace', fr: 'Copier le lien', de: 'Link kopieren', it: 'Copia link' });
  return (
    <div className="page-enter max-w-lg mx-auto px-4 py-10" data-testid="mp-room">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={p.onLeave} className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <span aria-hidden="true">&larr;</span> {tp('Выйти', 'Leave', 'Wyjdź', { es: 'Salir', fr: 'Quitter', de: 'Verlassen', it: 'Esci' })}
        </button>
        <span data-testid="mp-role-badge" className="text-sm px-2 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          {iAmHost ? tp('Ты хост', 'You are host', 'Jesteś hostem', { es: 'Eres el anfitrión', fr: 'Tu es l\'hôte', de: 'Du bist Host', it: 'Sei l\'host' }) : tp('Игрок', 'Player', 'Gracz', { es: 'Jugador', fr: 'Joueur', de: 'Spieler', it: 'Giocatore' })}
        </span>
      </div>
      <div className="card p-5 text-center mb-4" data-testid="mp-code-card">
        <div className="text-sm text-[var(--text-secondary)] mb-1">{tp('КОД ЛОББИ', 'LOBBY CODE', 'KOD LOBBY', { es: 'CÓDIGO DE SALA', fr: 'CODE DU SALON', de: 'LOBBY-CODE', it: 'CODICE LOBBY' })}</div>
        <div className="text-5xl font-bold font-mono tracking-[0.2em] text-[var(--text-primary)]">
          {room.code}
        </div>
        <button type="button" onClick={p.onShare} data-testid="mp-share-code"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-subtle)] px-4 text-base font-semibold text-[var(--accent-cyan)]">
          {shareLabel}
        </button>
      </div>

      <p className="mb-4 text-base text-[var(--text-secondary)]">
        {activeMission ? tp(activeMission.descRu, activeMission.descEn, activeMission.descPl, { es: activeMission.descEs, fr: activeMission.descFr, de: activeMission.descDe, it: activeMission.descIt }) : tp("Обычная гонка: старт, знак по левому борту, финиш.", "Standard race: start, leave the mark to port, finish.", "Zwykły wyścig: start, znak zostawiasz po lewej burcie, meta.", { es: "Regata normal: salida, baliza por babor, llegada.", fr: "Course standard : départ, bouée à bâbord, arrivée.", de: "Normales Rennen: Start, Bahnmarke an Backbord, Ziel.", it: "Regata standard: partenza, boa lasciata a sinistra, arrivo." })}
      </p>
      {iAmHost && (
        <details className="mb-4 border-y border-[var(--border-subtle)]">
          <summary className="cursor-pointer min-h-11 py-3 text-sm text-[var(--text-secondary)]">
            {tp("Настройки гонки", "Race settings", "Ustawienia wyścigu", { es: "Ajustes de la regata", fr: "Réglages de la course", de: "Renneinstellungen", it: "Impostazioni della regata" })}
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button type="button" onClick={() => p.onPickMission(null)} aria-pressed={!room.missionId}
              className="min-h-11 p-2 rounded-lg text-sm transition border" style={settingStyle(!room.missionId)}>
              🏁 {tp('Свободная', 'Free', 'Swobodny', { es: 'Libre', fr: 'Libre', de: 'Frei', it: 'Libera' })}
            </button>
            {missions.map((m) => (
              <button type="button" key={m.id} onClick={() => p.onPickMission(m.id)} aria-pressed={room.missionId === m.id}
                className="min-h-11 p-2 rounded-lg text-sm transition border text-left" style={settingStyle(room.missionId === m.id)}
                title={tp(m.descRu, m.descEn, m.descPl, { es: m.descEs, fr: m.descFr, de: m.descDe, it: m.descIt })}>
                {m.emoji} {tp(m.titleRu, m.titleEn, m.titlePl, { es: m.titleEs, fr: m.titleFr, de: m.titleDe, it: m.titleIt })}
              </button>
            ))}
          </div>
          {activeMission && (
            <div className="mt-2 mb-3 text-sm text-[var(--text-secondary)]">
              💡 {tp(activeMission.hintRu, activeMission.hintEn, activeMission.hintPl, { es: activeMission.hintEs, fr: activeMission.hintFr, de: activeMission.hintDe, it: activeMission.hintIt })}
            </div>
          )}
        </details>
      )}

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-[var(--text-secondary)]">{tp('ИГРОКИ', 'PLAYERS', 'GRACZE', { es: 'JUGADORES', fr: 'JOUEURS', de: 'SPIELER', it: 'GIOCATORI' })} · {totalCount} / {room.maxPlayers}</div>
          {iAmHost && (
            <div className="flex gap-1">
              <button type="button" onClick={p.onRemoveBot} disabled={botCount === 0}
                aria-label={tp('Убрать бота', 'Remove bot', 'Usuń bota', { es: 'Quitar un bot', fr: 'Retirer un bot', de: 'Bot entfernen', it: 'Rimuovi un bot' })}
                className="text-sm px-3 rounded disabled:opacity-30 min-h-11 min-w-[44px] border border-[var(--border-subtle)]">- {tp('бот', 'bot', 'bot', { es: 'bot', fr: 'bot', de: 'Bot', it: 'bot' })}</button>
              <button type="button" onClick={p.onAddBot} disabled={totalCount >= room.maxPlayers}
                aria-label={tp('Добавить бота', 'Add bot', 'Dodaj bota', { es: 'Añadir un bot', fr: 'Ajouter un bot', de: 'Bot hinzufügen', it: 'Aggiungi un bot' })}
                className="text-sm px-3 rounded disabled:opacity-30 min-h-11 min-w-[44px] border border-[var(--border-subtle)] text-[var(--accent-cyan)]">+ {tp('бот', 'bot', 'bot', { es: 'bot', fr: 'bot', de: 'Bot', it: 'bot' })}</button>
            </div>
          )}
        </div>
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
          {players.map((player, i) => (
            <div key={player.id} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.colors[i % p.colors.length] }} />
              <span className="flex-1 text-[var(--text-primary)]">
                {player.nickname}
                {player.isBot && <span className="text-sm text-[var(--text-muted)] ml-2">AI</span>}
                {!player.connected && !player.isBot && <span className="text-sm text-[var(--warning)] ml-2">{tp('разрыв', 'disconnected', 'rozłączony', { es: 'desconectado', fr: 'déconnecté', de: 'getrennt', it: 'disconnesso' })}</span>}
              </span>
              {player.id === room.hostId && <span className="text-sm px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,170,0,0.15)', color: 'var(--warning)' }}>{tp('хост', 'host', 'host', { es: 'anfitrión', fr: 'hôte', de: 'Host', it: 'host' })}</span>}
              {!player.isBot && player.id !== room.hostId && <span className="text-sm text-[var(--text-secondary)]">{player.ready ? tp("Готов", "Ready", "Gotowy", { es: "Listo", fr: "Prêt", de: "Bereit", it: "Pronto" }) : tp("Не готов", "Not ready", "Niegotowy", { es: "No está listo", fr: "Pas prêt", de: "Nicht bereit", it: "Non pronto" })}</span>}
              {player.id === room.myId && <span className="text-sm font-semibold text-[var(--text-secondary)]">{tp('ты', 'you', 'ty', { es: 'tú', fr: 'toi', de: 'du', it: 'tu' })}</span>}
            </div>
          ))}
        </div>
        <div className="text-sm text-[var(--text-muted)] mt-2">
          {tp('людей', 'humans', 'ludzi', { es: 'personas', fr: 'humains', de: 'Menschen', it: 'umani' })}: {humanCount} · {tp('ботов', 'bots', 'botów', { es: 'bots', fr: 'bots', de: 'Bots', it: 'bot' })}: {botCount}
        </div>
      </div>

      {iAmHost ? (
        <button type="button" onClick={p.onStart} disabled={totalCount < 1 || !allReady || p.reconnecting}
          className="w-full min-h-11 py-3 rounded-lg font-semibold text-base disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #44ff88, #22cc66)', color: '#0a1628' }}>
          {tp('Старт гонки', 'Start race', 'Rozpocznij wyścig', { es: 'Empezar la regata', fr: 'Lancer la course', de: 'Rennen starten', it: 'Avvia la regata' })} · {totalCount} {
            tp(
              totalCount === 1 ? 'лодка' : totalCount < 5 ? 'лодки' : 'лодок',
              totalCount === 1 ? 'boat' : 'boats',
              totalCount === 1 ? 'łódź' : totalCount < 5 ? 'łodzie' : 'łodzi',
              {
                es: totalCount === 1 ? 'barco' : 'barcos',
                fr: totalCount === 1 ? 'bateau' : 'bateaux',
                de: totalCount === 1 ? 'Boot' : 'Boote',
                it: totalCount === 1 ? 'barca' : 'barche',
              },
            )
          }
        </button>
      ) : (
        <div className="text-center text-sm text-[var(--text-muted)] py-3">
          <button type="button" className="w-full min-h-11 rounded-lg border px-4 py-3 text-base text-[var(--accent-cyan)]" aria-pressed={!!me?.ready} disabled={p.reconnecting} onClick={() => p.onReady(!me?.ready)}>
            {me?.ready ? tp("Готов, жду старта", "Ready, waiting for start", "Gotowy, czekam na start", { es: "Listo, esperando la salida", fr: "Prêt, j'attends le départ", de: "Bereit, warte auf den Start", it: "Pronto, attendo la partenza" }) : tp("Я готов", "I'm ready", "Jestem gotowy", { es: "Estoy listo", fr: "Je suis prêt", de: "Ich bin bereit", it: "Sono pronto" })}
          </button>
        </div>
      )}

      {p.error && <p role="alert" className="mt-3 break-all text-sm text-[var(--warning)]">{p.error}</p>}
      {iAmHost && !allReady && <p role="status" className="mt-3 text-sm text-[var(--text-secondary)]">{tp("Ждём готовности игроков", "Waiting for players to be ready", "Czekamy, aż gracze będą gotowi", { es: "Esperando a que los jugadores estén listos", fr: "En attente des joueurs", de: "Warten, bis alle bereit sind", it: "In attesa dei giocatori" })}</p>}
      {p.reconnecting && (
        <div className="mt-3 text-sm text-center px-3 py-2 rounded" style={{ background: 'rgba(255, 170, 0, 0.1)', color: 'var(--warning)' }}>
          {tp('Переподключаюсь...', 'Reconnecting...', 'Łączę ponownie...', { es: 'Reconectando...', fr: 'Reconnexion...', de: 'Verbinde neu...', it: 'Riconnessione...' })}
        </div>
      )}
    </div>
  );
}
