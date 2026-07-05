'use client';

import { useState } from 'react';
import { legacyPick } from '@/lib/languages';
import { ruleScenarios, type RuleScenario } from '@/data/rules';
import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';

// ============================================================================
// Scenario illustrations - pure SVG, stylized, readable on any background
// ============================================================================

function Boat({ x, y, rot = 0, color = '#ffffff', label }: { x: number; y: number; rot?: number; color?: string; label?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0,-10 Q5,0 3,8 L-3,8 Q-5,0 0,-10 Z" fill={color} stroke="#ffffff" strokeWidth="1" />
      {/* Sail */}
      <path d="M0,-6 Q3,-2 2,4 L0,4 Z" fill="#ffffff" opacity="0.9" />
      {label && <text x="0" y="18" textAnchor="middle" fontSize="8" fill={color}>{label}</text>}
    </g>
  );
}

function WindArrow({ x, y, length = 40 }: { x: number; y: number; length?: number }) {
  const { tp } = useI18n();
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + length} stroke="#00e5ff" strokeWidth="1.5" />
      <polygon points={`${x - 3},${y + length - 5} ${x + 3},${y + length - 5} ${x},${y + length}`} fill="#00e5ff" />
      <text x={x} y={y - 5} textAnchor="middle" fontSize="9" fill="#00e5ff">{tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })}</text>
    </g>
  );
}

function PortVsStarboard() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto">
      <WindArrow x={100} y={10} length={30} />
      <Boat x={140} y={85} rot={-45} color="#44ff88" label={tp('правый галс ✓', 'starboard ✓', 'prawy hals ✓', { es: 'estribor ✓', fr: 'tribord ✓', de: 'Steuerbord ✓', it: 'mure a dritta ✓' })} />
      <Boat x={60} y={85} rot={45} color="#ff6666" label={tp('левый галс ✗', 'port ✗', 'lewy hals ✗', { es: 'babor ✗', fr: 'babord ✗', de: 'Backbord ✗', it: 'mure a sinistra ✗' })} />
      <path d="M 75 80 Q 100 60 125 80" fill="none" stroke="#ffaa00" strokeWidth="1" strokeDasharray="3,3" />
    </svg>
  );
}

function WindwardLeeward() {
  // Both on same tack (starboard - wind from top-right). Heading roughly west-ish.
  // Windward = closer to wind = upper boat. Leeward = farther from wind = lower boat.
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto">
      <WindArrow x={100} y={10} length={25} />
      <Boat x={130} y={55} rot={-70} color="#ff6666" label={tp('наветренный ✗', 'windward ✗', 'nawietrzny ✗', { es: 'barlovento ✗', fr: 'au vent ✗', de: 'luv ✗', it: 'sopravento ✗' })} />
      <Boat x={70} y={95} rot={-70} color="#44ff88" label={tp('подветренный ✓', 'leeward ✓', 'zawietrzny ✓', { es: 'sotavento ✓', fr: 'sous le vent ✓', de: 'lee ✓', it: 'sottovento ✓' })} />
      <path d="M 95 75 L 55 90" fill="none" stroke="#8ba7b8" strokeWidth="0.5" strokeDasharray="2,2" />
    </svg>
  );
}

function Overtaking() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto">
      <WindArrow x={30} y={10} length={20} />
      <Boat x={120} y={50} rot={0} color="#44ff88" label={tp('впереди', 'ahead', 'z przodu', { es: 'delante', fr: 'devant', de: 'voraus', it: 'davanti' })} />
      <Boat x={100} y={100} rot={0} color="#ff6666" label={tp('обгоняющий', 'overtaker', 'wyprzedzajacy', { es: 'que alcanza', fr: 'qui rattrape', de: 'Uberholer', it: 'che raggiunge' })} />
      <path d="M 105 95 Q 115 75 120 60" fill="none" stroke="#ffaa00" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill="#ffaa00" /></marker>
      </defs>
      <text x="100" y="130" textAnchor="middle" fontSize="9" fill="#8ba7b8">{tp('обгоняющий уступает', 'overtaker gives way', 'wyprzedzajacy ustepuje', { es: 'el que alcanza cede', fr: 'le rattrapant s\'ecarte', de: 'Uberholer weicht aus', it: 'chi raggiunge da strada' })}</text>
    </svg>
  );
}

function MarkRoom() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto">
      <circle cx="100" cy="50" r="8" fill="#ffaa00" stroke="#ffffff" strokeWidth="1.5" />
      <text x="100" y="35" textAnchor="middle" fontSize="8" fill="#ffaa00">{tp('знак', 'mark', 'znak', { es: 'baliza', fr: 'marque', de: 'Bahnmarke', it: 'boa' })}</text>
      <circle cx="100" cy="50" r="35" fill="none" stroke="#ffaa00" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.6" />
      <Boat x={80} y={90} rot={-45} color="#44ff88" label={tp('внутренняя ✓', 'inside ✓', 'wewnetrzna ✓', { es: 'interior ✓', fr: 'interieur ✓', de: 'innen ✓', it: 'interna ✓' })} />
      <Boat x={50} y={100} rot={-45} color="#ff6666" label={tp('внешняя', 'outside', 'zewnetrzna', { es: 'exterior', fr: 'exterieur', de: 'aussen', it: 'esterna' })} />
      <text x="100" y="130" textAnchor="middle" fontSize="8" fill="#8ba7b8">{tp('внешняя даёт место', 'outside gives room', 'zewnetrzna daje miejsce', { es: 'la exterior da espacio', fr: 'l\'exterieur donne de la place', de: 'aussen gibt Raum', it: 'l\'esterna da spazio' })}</text>
    </svg>
  );
}

function Crossing() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto">
      <WindArrow x={100} y={10} length={20} />
      <Boat x={45} y={90} rot={45} color="#44ff88" label={tp('я', 'me', 'ja', { es: 'yo', fr: 'moi', de: 'ich', it: 'io' })} />
      <Boat x={155} y={90} rot={-45} color="#ff6666" label={tp('соперник', 'opponent', 'rywal', { es: 'rival', fr: 'adversaire', de: 'Gegner', it: 'avversario' })} />
      <line x1="55" y1="82" x2="145" y2="82" stroke="#8ba7b8" strokeWidth="0.5" strokeDasharray="2,2" />
      <text x="100" y="65" textAnchor="middle" fontSize="11" fill="#ffaa00" fontWeight="600">?</text>
      <text x="100" y="130" textAnchor="middle" fontSize="8" fill="#8ba7b8">{tp('избегай контакта!', 'avoid contact!', 'unikaj kontaktu!', { es: 'evita el contacto!', fr: 'evite le contact!', de: 'Kontakt vermeiden!', it: 'evita il contatto!' })}</text>
    </svg>
  );
}

function StartLine() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto">
      <WindArrow x={100} y={5} length={20} />
      <line x1="20" y1="60" x2="180" y2="60" stroke="#ffaa00" strokeWidth="2" strokeDasharray="4,3" />
      <circle cx="20" cy="60" r="5" fill="#ffaa00" />
      <circle cx="180" cy="60" r="5" fill="#ffaa00" />
      <text x="100" y="52" textAnchor="middle" fontSize="9" fill="#ffaa00" fontWeight="600">{tp('СТАРТ', 'START', 'START', { es: 'SALIDA', fr: 'DEPART', de: 'START', it: 'PARTENZA' })}</text>
      <Boat x={55} y={100} rot={-30} color="#44ff88" />
      <Boat x={85} y={105} rot={25} color="#ffffff" />
      <Boat x={120} y={100} rot={-15} color="#ffaa00" />
      <Boat x={155} y={105} rot={20} color="#44aaff" />
      <text x="100" y="130" textAnchor="middle" fontSize="8" fill="#8ba7b8">{tp('разгон + чистый ветер', 'speed + clear air', 'rozped + czyste powietrze', { es: 'velocidad + aire limpio', fr: 'vitesse + air propre', de: 'Speed + freier Wind', it: 'velocita + aria pulita' })}</text>
    </svg>
  );
}

function CollisionAvoid() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto">
      <Boat x={70} y={70} rot={45} color="#ff6666" />
      <Boat x={130} y={70} rot={-45} color="#ff6666" />
      <text x="100" y="50" textAnchor="middle" fontSize="16" fill="#ff4444">⚠️</text>
      <text x="100" y="110" textAnchor="middle" fontSize="9" fill="#ffaa00">{tp('увалиться / затормозить', 'bear away / slow down', 'odpadnij / zwolnij', { es: 'arribar / frenar', fr: 'abattre / ralentir', de: 'abfallen / verlangsamen', it: 'poggiare / rallentare' })}</text>
      <text x="100" y="125" textAnchor="middle" fontSize="8" fill="#8ba7b8">{tp('безопасность > правота', 'safety > being right', 'bezpieczenstwo > racja', { es: 'seguridad > tener razon', fr: 'securite > avoir raison', de: 'Sicherheit > Rechthaben', it: 'sicurezza > aver ragione' })}</text>
    </svg>
  );
}

function Penalty() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto">
      <WindArrow x={30} y={10} length={20} />
      <path d="M 100 30 A 30 30 0 1 1 100 90 A 30 30 0 1 1 100 30" fill="none" stroke="#ffaa00" strokeWidth="1.5" strokeDasharray="4,3" />
      <Boat x={100} y={30} rot={0} color="#ff6666" label="1" />
      <Boat x={130} y={60} rot={90} color="#ffffff" label="2" />
      <Boat x={100} y={90} rot={180} color="#ffffff" label="3" />
      <Boat x={70} y={60} rot={-90} color="#44ff88" label="4" />
      <text x="100" y="125" textAnchor="middle" fontSize="8" fill="#8ba7b8">{tp('360° = оверштаг + фордевинд', 'one turn = tack + gybe', 'jeden obrot = zwrot + jibe', { es: 'una vuelta = virada + trasluchada', fr: 'un tour = virement + empannage', de: 'eine Drehung = Wende + Halse', it: 'un giro = virata + strambata' })}</text>
    </svg>
  );
}

const SVG_MAP: Record<RuleScenario['svg'], () => React.ReactElement> = {
  'port-vs-starboard': PortVsStarboard,
  'windward-leeward': WindwardLeeward,
  overtaking: Overtaking,
  'mark-room': MarkRoom,
  crossing: Crossing,
  'start-line': StartLine,
  'collision-avoid': CollisionAvoid,
  penalty: Penalty,
};

// ============================================================================
// Page
// ============================================================================

export default function RulesPage() {
  const { lang, tp } = useI18n();
  const [openId, setOpenId] = useState<string | null>(ruleScenarios[0].id);

  // Pick field per lang. EN stays as the international subtitle.
  const pickTitle = (r: RuleScenario) => legacyPick(r, 'title', lang);
  const pickScene = (r: RuleScenario) => legacyPick(r, 'scene', lang);
  const pickQuestion = (r: RuleScenario) => legacyPick(r, 'question', lang);
  const pickAnswer = (r: RuleScenario) => legacyPick(r, 'answer', lang);
  const pickWhy = (r: RuleScenario) => legacyPick(r, 'why', lang);
  const pickPractice = (r: RuleScenario) => legacyPick(r, 'inPractice', lang);

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid rgba(255, 170, 0, 0.25)', color: 'var(--warning)' }}>
          📖 {tp('Простые правила', 'Simple rules', 'Proste zasady', { es: 'Reglas simples', fr: 'Regles simples', de: 'Einfache Regeln', it: 'Regole semplici' })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp(
            'Правила на воде: RRS + МППСС',
            'Rules on the water: RRS + COLREGS',
            'Zasady na wodzie: RRS + COLREGS',
            {
              es: 'Reglas en el agua: RRS + RIPA',
              fr: 'Regles sur l\'eau: RRS + RIPAM',
              de: 'Regeln auf dem Wasser: RRS + KVR',
              it: 'Regole in acqua: RRS + COLREG',
            },
          )}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Две системы правил: RRS (гоночные правила World Sailing, действуют только между гонщиками на дистанции) и МППСС-72 (международные правила предупреждения столкновений, действуют ВСЕГДА для каждого судна). Знать надо обе.',
            'Two rule systems: RRS (World Sailing racing rules, apply only between racing boats on the course) and COLREGS / IRPCS (International Regulations for Preventing Collisions at Sea, apply ALWAYS to every vessel). Both are essential.',
            'Dwa systemy zasad: RRS (przepisy regatowe World Sailing, obowiazuja tylko miedzy zawodnikami na trasie) i COLREGS / МППСС-72 (miedzynarodowe przepisy o zapobieganiu zderzeniom na morzu, obowiazuja ZAWSZE dla kazdej jednostki). Oba sa konieczne.',
            {
              es: 'Dos sistemas de reglas: RRS (reglas de regata de World Sailing, se aplican solo entre barcos que compiten en el recorrido) y RIPA / COLREG (Reglamento Internacional para Prevenir los Abordajes, se aplica SIEMPRE a toda embarcacion). Ambos son esenciales.',
              fr: 'Deux systemes de regles: RRS (regles de course de World Sailing, s\'appliquent seulement entre bateaux en regate sur le parcours) et RIPAM / COLREG (Reglement International pour Prevenir les Abordages en Mer, s\'applique TOUJOURS a tout navire). Les deux sont essentiels.',
              de: 'Zwei Regelsysteme: RRS (Wettfahrtregeln von World Sailing, gelten nur zwischen Regattabooten auf der Bahn) und KVR / COLREG (Internationale Regeln zur Verhutung von Zusammenstossen auf See, gelten IMMER fur jedes Fahrzeug). Beide sind unverzichtbar.',
              it: 'Due sistemi di regole: RRS (regole di regata di World Sailing, valide solo tra le barche in regata sul percorso) e COLREG (Regolamento Internazionale per Prevenire gli Abbordi in Mare, vale SEMPRE per ogni imbarcazione). Entrambi sono essenziali.',
            },
          )}
        </p>
      </div>

      {/* --- RRS section --- */}
      <div className="mb-6 flex items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
             style={{ background: 'rgba(255, 170, 0, 0.12)', border: '1px solid rgba(255, 170, 0, 0.28)', color: 'var(--warning)' }}>
          🏁 RRS
        </div>
        <h2 className="text-base sm:text-lg font-semibold">
          {tp('Гоночные правила (World Sailing)', 'Racing Rules of Sailing', 'Przepisy regatowe (World Sailing)', { es: 'Reglas de Regata a Vela (World Sailing)', fr: 'Regles de course a la voile (World Sailing)', de: 'Wettfahrtregeln Segeln (World Sailing)', it: 'Regole di regata della vela (World Sailing)' })}
        </h2>
      </div>

      {/* Scenario cards - RRS */}
      <div className="space-y-3 mb-10">
        {ruleScenarios.filter((r) => r.source !== 'colregs').map((r) => {
          const isOpen = openId === r.id;
          const SvgComp = SVG_MAP[r.svg];
          return (
            <div
              key={r.id}
              className="card overflow-hidden transition-all"
              style={{ borderColor: isOpen ? 'rgba(255, 170, 0, 0.3)' : undefined }}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : r.id)}
                className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{r.icon}</span>
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-semibold truncate">{pickTitle(r)}</div>
                    {lang !== 'en' && (
                      <div className="text-xs text-[var(--text-muted)] truncate">{r.titleEn}</div>
                    )}
                  </div>
                </div>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 grid grid-cols-1 md:grid-cols-[200px,1fr] gap-5">
                  {/* Illustration */}
                  <div className="rounded-lg p-2" style={{ background: 'rgba(11, 30, 56, 0.9)' }}>
                    <SvgComp />
                    <div className="text-[9px] text-center text-[var(--text-muted)] mt-1">
                      {tp('схематично, не в масштабе', 'schematic, not to scale', 'schematycznie, nie w skali', { es: 'esquematico, no a escala', fr: 'schematique, pas a l\'echelle', de: 'schematisch, nicht massstabsgetreu', it: 'schematico, non in scala' })}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        {tp('Сцена', 'Scene', 'Scena', { es: 'Escena', fr: 'Scene', de: 'Szene', it: 'Scena' })}
                      </div>
                      <p className="text-[var(--text-secondary)]">{pickScene(r)}</p>
                    </div>

                    <div className="p-3 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>
                        {tp('Вопрос → Ответ', 'Question → Answer', 'Pytanie → Odpowiedz', { es: 'Pregunta → Respuesta', fr: 'Question → Reponse', de: 'Frage → Antwort', it: 'Domanda → Risposta' })}
                      </div>
                      <p className="font-medium mb-2">{pickQuestion(r)}</p>
                      <p className="text-[var(--text-primary)]">{pickAnswer(r)}</p>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        {tp('Почему', 'Why', 'Dlaczego', { es: 'Por que', fr: 'Pourquoi', de: 'Warum', it: 'Perche' })}
                      </div>
                      <p className="text-[var(--text-secondary)]">{pickWhy(r)}</p>
                    </div>

                    <div className="p-3 rounded-lg" style={{ background: 'rgba(68, 255, 136, 0.05)', border: '1px solid rgba(68, 255, 136, 0.15)' }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--success)' }}>
                        {tp('На практике', 'In practice', 'W praktyce', { es: 'En la practica', fr: 'En pratique', de: 'In der Praxis', it: 'In pratica' })}
                      </div>
                      <p className="text-[var(--text-primary)]">{pickPractice(r)}</p>
                    </div>

                    {lang !== 'en' && (
                    <details className="text-xs text-[var(--text-muted)]">
                      <summary className="cursor-pointer hover:text-[var(--text-secondary)]">English version</summary>
                      <div className="mt-2 space-y-2 pl-2 border-l border-[rgba(139,167,184,0.2)]">
                        <p><strong>Scene:</strong> {r.sceneEn}</p>
                        <p><strong>Q:</strong> {r.questionEn}</p>
                        <p><strong>A:</strong> {r.answerEn}</p>
                        <p><strong>Why:</strong> {r.whyEn}</p>
                        <p><strong>In practice:</strong> {r.inPracticeEn}</p>
                      </div>
                    </details>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- COLREGS section --- */}
      <div className="mb-6 flex items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
             style={{ background: 'rgba(0, 212, 255, 0.12)', border: '1px solid rgba(0, 212, 255, 0.28)', color: 'var(--accent-cyan)' }}>
          🌊 {tp('COLREGS / МППСС-72', 'COLREGS / IRPCS', 'COLREGS', { es: 'COLREG / RIPA', fr: 'COLREG / RIPAM', de: 'COLREG / KVR', it: 'COLREG' })}
        </div>
        <h2 className="text-base sm:text-lg font-semibold">
          {tp(
            'Международные правила предупреждения столкновений',
            'International Regulations for Preventing Collisions at Sea',
            'Miedzynarodowe przepisy o zapobieganiu zderzeniom na morzu',
            {
              es: 'Reglamento Internacional para Prevenir los Abordajes',
              fr: 'Reglement International pour Prevenir les Abordages en Mer',
              de: 'Internationale Regeln zur Verhutung von Zusammenstossen auf See',
              it: 'Regolamento Internazionale per Prevenire gli Abbordi in Mare',
            },
          )}
        </h2>
      </div>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5 max-w-2xl">
        {tp(
          'RRS действуют только во время гонки между гонщиками. В остальных случаях (выход из порта, прогулка, встреча с моторным судном) работают МППСС-72. Их обязан знать любой у штурвала.',
          'RRS applies only during a race between racing boats. Everywhere else (leaving harbour, cruising, meeting a power vessel), COLREGS / IRPCS applies. Every helmsman must know them.',
          'RRS obowiazuje tylko podczas regat miedzy zawodnikami. W innych sytuacjach (wyjscie z portu, rejs, spotkanie z jednostka motorowa) obowiazuje COLREGS. Musi je znac kazdy przy sterze.',
          {
            es: 'Las RRS solo se aplican durante una regata entre barcos que compiten. En todos los demas casos (salir de puerto, navegar, cruzarse con un barco a motor) se aplica el RIPA. Todo timonel debe conocerlo.',
            fr: 'Les RRS ne s\'appliquent que pendant une course entre bateaux en regate. Partout ailleurs (sortie de port, croisiere, rencontre avec un navire a moteur), le RIPAM s\'applique. Tout barreur doit le connaitre.',
            de: 'Die RRS gelten nur wahrend einer Wettfahrt zwischen Regattabooten. In allen anderen Fallen (Hafenausfahrt, Toern, Begegnung mit einem Motorboot) gelten die KVR. Jeder am Ruder muss sie kennen.',
            it: 'Le RRS valgono solo durante una regata tra barche che competono. In tutti gli altri casi (uscita dal porto, crociera, incontro con un mezzo a motore) valgono le COLREG. Ogni timoniere deve conoscerle.',
          },
        )}
      </p>

      <div className="space-y-3 mb-10">
        {ruleScenarios.filter((r) => r.source === 'colregs').map((r) => {
          const isOpen = openId === r.id;
          const SvgComp = SVG_MAP[r.svg];
          return (
            <div
              key={r.id}
              className="card overflow-hidden transition-all"
              style={{ borderColor: isOpen ? 'rgba(0, 212, 255, 0.3)' : undefined }}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : r.id)}
                className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{r.icon}</span>
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-semibold truncate">{pickTitle(r)}</div>
                    {lang !== 'en' && (
                      <div className="text-xs text-[var(--text-muted)] truncate">{r.titleEn}</div>
                    )}
                  </div>
                </div>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 grid grid-cols-1 md:grid-cols-[200px,1fr] gap-5">
                  <div className="rounded-lg p-2" style={{ background: 'rgba(11, 30, 56, 0.9)' }}>
                    <SvgComp />
                    <div className="text-[9px] text-center text-[var(--text-muted)] mt-1">
                      {tp('схематично, не в масштабе', 'schematic, not to scale', 'schematycznie, nie w skali', { es: 'esquematico, no a escala', fr: 'schematique, pas a l\'echelle', de: 'schematisch, nicht massstabsgetreu', it: 'schematico, non in scala' })}
                    </div>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        {tp('Сцена', 'Scene', 'Scena', { es: 'Escena', fr: 'Scene', de: 'Szene', it: 'Scena' })}
                      </div>
                      <p className="text-[var(--text-secondary)]">{pickScene(r)}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>
                        {tp('Вопрос → Ответ', 'Question → Answer', 'Pytanie → Odpowiedz', { es: 'Pregunta → Respuesta', fr: 'Question → Reponse', de: 'Frage → Antwort', it: 'Domanda → Risposta' })}
                      </div>
                      <p className="font-medium mb-2">{pickQuestion(r)}</p>
                      <p className="text-[var(--text-primary)] whitespace-pre-line">{pickAnswer(r)}</p>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        {tp('Почему', 'Why', 'Dlaczego', { es: 'Por que', fr: 'Pourquoi', de: 'Warum', it: 'Perche' })}
                      </div>
                      <p className="text-[var(--text-secondary)]">{pickWhy(r)}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(68, 255, 136, 0.05)', border: '1px solid rgba(68, 255, 136, 0.15)' }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--success)' }}>
                        {tp('На практике', 'In practice', 'W praktyce', { es: 'En la practica', fr: 'En pratique', de: 'In der Praxis', it: 'In pratica' })}
                      </div>
                      <p className="text-[var(--text-primary)]">{pickPractice(r)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* COLREGS official links - language-aware */}
      <div className="mb-10 p-5 card" style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.2)' }}>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          <span className="font-semibold text-[var(--text-primary)]">
            {tp('Официальный текст МППСС-72:', 'Official COLREGS text:', 'Oficjalny tekst MPZZM (COLREGS):', { es: 'Texto oficial del RIPA:', fr: 'Texte officiel du RIPAM:', de: 'Offizieller KVR-Text:', it: 'Testo ufficiale delle COLREG:' })}
          </span>{' '}
          {tp(
            'принят Международной морской организацией (IMO) в 1972, действует во всех странах-подписантах. Обновлялись несколько раз, текущая редакция включает поправки 2007.',
            'adopted by the International Maritime Organization (IMO) in 1972, binding in all signatory countries. Amended several times, current edition includes 2007 revisions.',
            'przyjete przez Miedzynarodowa Organizacje Morska (IMO) w 1972, obowiazuje we wszystkich panstwach-sygnatariuszach. Kilkakrotnie nowelizowane, obecna redakcja zawiera poprawki z 2007.',
            {
              es: 'adoptado por la Organizacion Maritima Internacional (OMI) en 1972, vinculante en todos los paises signatarios. Enmendado varias veces, la edicion actual incluye las revisiones de 2007.',
              fr: 'adopte par l\'Organisation Maritime Internationale (OMI) en 1972, contraignant dans tous les pays signataires. Modifie plusieurs fois, l\'edition actuelle inclut les revisions de 2007.',
              de: 'angenommen von der Internationalen Seeschifffahrts-Organisation (IMO) 1972, verbindlich in allen Unterzeichnerstaaten. Mehrfach geandert, die aktuelle Fassung enthalt die Anderungen von 2007.',
              it: 'adottato dall\'Organizzazione Marittima Internazionale (IMO) nel 1972, vincolante in tutti i paesi firmatari. Emendato piu volte, l\'edizione attuale include le revisioni del 2007.',
            },
          )}
        </p>
        {lang === 'ru' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <a href="https://fps30.ru/images/biblioteka/MPPSS-72.pdf" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              МППСС-72 PDF (рус.) ↓
            </a>
            <a href="https://www.imo.org/en/OurWork/Safety/Pages/Preventing-Collisions.aspx" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              IMO оригинал (англ.) →
            </a>
          </div>
        )}
        {lang === 'en' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <a href="https://www.imo.org/en/OurWork/Safety/Pages/Preventing-Collisions.aspx" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              IMO official text →
            </a>
            <a href="https://www.navcen.uscg.gov/sites/default/files/pdf/navRules/navrules.pdf" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              US Navigation Rules PDF ↓
            </a>
          </div>
        )}
        {lang === 'pl' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <a href="https://pya.org.pl/polski-zwiazek-zeglarski/page/przepisy-zeglarskie/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              Polski Zwiazek Zeglarski →
            </a>
            <a href="https://www.imo.org/en/OurWork/Safety/Pages/Preventing-Collisions.aspx" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              IMO tekst oryginalny (ang.) →
            </a>
          </div>
        )}
        {lang === 'es' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <a href="https://rfev.es/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              Real Federacion Espanola de Vela →
            </a>
            <a href="https://www.imo.org/en/OurWork/Safety/Pages/Preventing-Collisions.aspx" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              IMO texto original (ing.) →
            </a>
          </div>
        )}
        {lang === 'fr' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <a href="https://www.ffvoile.fr/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              Federation Francaise de Voile →
            </a>
            <a href="https://www.imo.org/en/OurWork/Safety/Pages/Preventing-Collisions.aspx" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              IMO texte original (ang.) →
            </a>
          </div>
        )}
        {lang === 'de' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <a href="https://www.dsv.org/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              Deutscher Segler-Verband →
            </a>
            <a href="https://www.imo.org/en/OurWork/Safety/Pages/Preventing-Collisions.aspx" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              IMO Originaltext (en.) →
            </a>
          </div>
        )}
        {lang === 'it' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <a href="https://www.federvela.it/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              Federazione Italiana Vela →
            </a>
            <a href="https://www.imo.org/en/OurWork/Safety/Pages/Preventing-Collisions.aspx" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              IMO testo originale (ing.) →
            </a>
          </div>
        )}
      </div>

      <div className="mt-10 p-5 card" style={{ background: 'rgba(255, 170, 0, 0.04)', borderColor: 'rgba(255, 170, 0, 0.2)' }}>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          <span className="font-semibold text-[var(--text-primary)]">
            {tp('Официальный текст RRS:', 'Official RRS text:', 'Oficjalny tekst RRS:', { es: 'Texto oficial de las RRS:', fr: 'Texte officiel des RRS:', de: 'Offizieller RRS-Text:', it: 'Testo ufficiale delle RRS:' })}
          </span>{' '}
          {tp(
            'Racing Rules of Sailing 2025-2028, выпускается World Sailing, действует с 1 января 2025 до 31 декабря 2028. То, что выше - упрощённая версия для входа в тему.',
            'Racing Rules of Sailing 2025-2028, published by World Sailing, in force from 1 January 2025 to 31 December 2028. The scenarios above are a simplified intro to the topic.',
            'Racing Rules of Sailing 2025-2028, wydawane przez World Sailing, obowiazuja od 1 stycznia 2025 do 31 grudnia 2028. Scenariusze powyzej to uproszczony wstep do tematu.',
            {
              es: 'Racing Rules of Sailing 2025-2028, publicadas por World Sailing, en vigor del 1 de enero de 2025 al 31 de diciembre de 2028. Lo anterior es una version simplificada para introducirse en el tema.',
              fr: 'Racing Rules of Sailing 2025-2028, publiees par World Sailing, en vigueur du 1er janvier 2025 au 31 decembre 2028. Ce qui precede est une version simplifiee pour aborder le sujet.',
              de: 'Racing Rules of Sailing 2025-2028, herausgegeben von World Sailing, gultig vom 1. Januar 2025 bis 31. Dezember 2028. Das Obige ist eine vereinfachte Fassung als Einstieg ins Thema.',
              it: 'Racing Rules of Sailing 2025-2028, pubblicate da World Sailing, in vigore dal 1 gennaio 2025 al 31 dicembre 2028. Quanto sopra e una versione semplificata per introdurre l\'argomento.',
            },
          )}
        </p>
        {lang === 'ru' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <a href="https://www.sailing.org/racingrules/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              World Sailing (офиц.) →
            </a>
            <a href="https://vfps.ru/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              ВФПС РФ (рус.) →
            </a>
            <a href="https://www.asiansailing.org/wp-content/uploads/2024/07/RRS-2025-2028-Final.pdf" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              RRS 2025-2028 PDF ↓
            </a>
          </div>
        )}
        {lang === 'en' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <a href="https://www.sailing.org/racingrules/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              World Sailing (official) →
            </a>
            <a href="https://www.ussailing.org/competition/rules-officiating/the-racing-rules-of-sailing-2025-2028/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              US Sailing + prescr. →
            </a>
            <a href="https://www.asiansailing.org/wp-content/uploads/2024/07/RRS-2025-2028-Final.pdf" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              RRS 2025-2028 PDF ↓
            </a>
          </div>
        )}
        {lang === 'pl' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <a href="https://www.sailing.org/racingrules/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              World Sailing (oficjalne) →
            </a>
            <a href="https://pya.org.pl/polski-zwiazek-zeglarski/page/przepisy-zeglarskie/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              PZZ / PYA (pol.) →
            </a>
            <a href="https://www.asiansailing.org/wp-content/uploads/2024/07/RRS-2025-2028-Final.pdf" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              RRS 2025-2028 PDF (ang.) ↓
            </a>
          </div>
        )}
        {lang === 'es' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <a href="https://www.sailing.org/racingrules/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              World Sailing (oficial) →
            </a>
            <a href="https://rfev.es/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              RFEV (es.) →
            </a>
            <a href="https://www.asiansailing.org/wp-content/uploads/2024/07/RRS-2025-2028-Final.pdf" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              RRS 2025-2028 PDF (ing.) ↓
            </a>
          </div>
        )}
        {lang === 'fr' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <a href="https://www.sailing.org/racingrules/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              World Sailing (officiel) →
            </a>
            <a href="https://www.ffvoile.fr/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              FFVoile (fr.) →
            </a>
            <a href="https://www.asiansailing.org/wp-content/uploads/2024/07/RRS-2025-2028-Final.pdf" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              RRS 2025-2028 PDF (ang.) ↓
            </a>
          </div>
        )}
        {lang === 'de' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <a href="https://www.sailing.org/racingrules/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              World Sailing (offiziell) →
            </a>
            <a href="https://www.dsv.org/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              DSV (de.) →
            </a>
            <a href="https://www.asiansailing.org/wp-content/uploads/2024/07/RRS-2025-2028-Final.pdf" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              RRS 2025-2028 PDF (en.) ↓
            </a>
          </div>
        )}
        {lang === 'it' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <a href="https://www.sailing.org/racingrules/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              World Sailing (ufficiale) →
            </a>
            <a href="https://www.federvela.it/" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              Federvela (it.) →
            </a>
            <a href="https://www.asiansailing.org/wp-content/uploads/2024/07/RRS-2025-2028-Final.pdf" target="_blank" rel="noopener noreferrer"
               className="px-3 py-2 rounded-lg border text-center transition hover:text-[var(--accent-cyan)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>
              RRS 2025-2028 PDF (ing.) ↓
            </a>
          </div>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
          {tp(
            'Если один из сайтов не открывается - попробуй следующий. Официальный текст одинаковый.',
            'If one of the sites is down - try the next one. The official text is identical.',
            'Jesli jedna ze stron nie dziala - sprobuj nastepna. Tekst oficjalny jest identyczny.',
            {
              es: 'Si uno de los sitios no funciona, prueba el siguiente. El texto oficial es identico.',
              fr: 'Si l\'un des sites ne fonctionne pas, essaie le suivant. Le texte officiel est identique.',
              de: 'Wenn eine der Seiten nicht funktioniert, probiere die nachste. Der offizielle Text ist identisch.',
              it: 'Se uno dei siti non funziona, prova il successivo. Il testo ufficiale e identico.',
            },
          )}
        </p>
      </div>

      <ContentFooterNav page="/rules" />
    </div>
  );
}
