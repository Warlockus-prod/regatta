import { ImageResponse } from 'next/og';
import { isLang, type Lang } from '@/lib/languages';

// Localized OpenGraph/Twitter share image. The language lives in the URL
// (/api/og?lang=xx) because a link-preview crawler fetches og:image by its own
// URL, carrying no cookie and no Accept-Language - so the only way to give it
// the right-language card is to encode the language in the image URL. The root
// layout's generateMetadata points og:image + twitter:image here with the
// language it already resolved for the page.
export const dynamic = 'force-dynamic';

const SIZE = { width: 1200, height: 630 };

// Headline + subhead reuse the phrasing already reviewed in layout.tsx's
// twitter strings. ASCII-only punctuation (project rule); diacritics kept for
// es/fr/de/it, none for pl.
const STRINGS: Record<Lang, { headline: string; sub: string; pills: string[] }> = {
  ru: { headline: 'До регаты неделя?', sub: 'Успеешь разобраться.', pills: ['45 мин', 'AI-тренер', 'Гонка с соперниками', '7 языков'] },
  en: { headline: 'Racing next week?', sub: 'You can still prep.', pills: ['45 min', 'AI coach', 'Race with rivals', '7 languages'] },
  pl: { headline: 'Regaty za tydzien?', sub: 'Zdazysz sie przygotowac.', pills: ['45 min', 'Trener AI', 'Wyscig z rywalami', '7 jezykow'] },
  es: { headline: 'Regata la proxima semana?', sub: 'Aun tienes tiempo de prepararte.', pills: ['45 min', 'Entrenador IA', 'Regata con rivales', '7 idiomas'] },
  fr: { headline: 'Regate la semaine prochaine ?', sub: 'Tu peux encore te preparer.', pills: ['45 min', 'Coach IA', 'Course avec rivaux', '7 langues'] },
  de: { headline: 'Regatta naechste Woche?', sub: 'Du kannst dich noch vorbereiten.', pills: ['45 Min', 'KI-Coach', 'Rennen gegen Rivalen', '7 Sprachen'] },
  it: { headline: 'Regata la prossima settimana?', sub: 'Hai ancora tempo per prepararti.', pills: ['45 min', 'Coach IA', 'Regata con rivali', '7 lingue'] },
};

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('lang');
  const lang: Lang = isLang(q) ? q : 'ru';
  const s = STRINGS[lang];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a1628 0%, #071a30 50%, #0d2847 100%)',
          padding: '60px 80px',
          fontFamily: 'system-ui, sans-serif',
          color: '#e8f4f8',
          position: 'relative',
        }}
      >
        {/* Top badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 22, color: '#00d4ff', marginBottom: 20 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20l3.5-3.5" />
            <path d="M18 4l-6.5 6.5" />
            <path d="M2 20l8-2-6-6-2 8z" />
            <path d="M18 4l2 2-8 8" />
          </svg>
          <span>REGATTA · SAILING TRAINER</span>
        </div>

        {/* Main headline (wraps within the padded width for longer languages) */}
        <div style={{
          display: 'flex',
          width: '100%',
          fontSize: 76,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          marginBottom: 24,
          color: '#ffffff',
        }}>
          {s.headline}
        </div>

        <div style={{
          display: 'flex',
          width: '100%',
          fontSize: 56,
          fontWeight: 700,
          lineHeight: 1.05,
          color: '#00d4ff',
          marginBottom: 34,
        }}>
          {s.sub}
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 12, fontSize: 24, color: '#8ba7b8', flexWrap: 'wrap' }}>
          {s.pills.map((label, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                padding: '8px 18px',
                border: i === 0 ? '1px solid rgba(0, 212, 255, 0.35)' : '1px solid rgba(139, 167, 184, 0.35)',
                borderRadius: 999,
                color: i === 0 ? '#00d4ff' : '#8ba7b8',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div style={{
          position: 'absolute',
          bottom: 60,
          right: 80,
          fontSize: 26,
          color: '#5a7a8a',
          fontFamily: 'ui-monospace, monospace',
        }}>
          weektoregatta.com
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        // Cacheable by CDNs/messengers; short browser TTL, longer shared TTL.
        'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
