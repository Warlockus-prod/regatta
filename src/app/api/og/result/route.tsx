import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nick = (url.searchParams.get('nick') || 'Player').slice(0, 20);
  const time = url.searchParams.get('time') || '-';
  const place = url.searchParams.get('place') || '';
  const of = url.searchParams.get('of') || '';
  const code = url.searchParams.get('code') || '';
  const difficulty = url.searchParams.get('difficulty') || 'medium';
  const wind = url.searchParams.get('wind') || 'medium';
  const mission = url.searchParams.get('mission') || '';

  const accent = difficulty === 'easy' ? '#44ff88' : difficulty === 'hard' ? '#ff4444' : '#ffaa00';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a1628 0%, #071a30 55%, #0d2847 100%)',
          padding: '48px 64px',
          fontFamily: 'system-ui, sans-serif',
          color: '#e8f4f8',
          position: 'relative',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, color: '#00d4ff' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20l3.5-3.5" />
            <path d="M18 4l-6.5 6.5" />
            <path d="M2 20l8-2-6-6-2 8z" />
            <path d="M18 4l2 2-8 8" />
          </svg>
          <span>REGATTA</span>
        </div>

        {/* main */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 60, marginTop: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: 30, color: '#8ba7b8', marginBottom: 8 }}>
              {nick} · finish
            </div>
            <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1, color: '#ffffff', letterSpacing: '-0.03em' }}>
              {time}
            </div>
            {place && of && (
              <div style={{ fontSize: 34, color: accent, marginTop: 18, fontWeight: 700 }}>
                место {place} / {of}
              </div>
            )}
            {mission && (
              <div style={{ fontSize: 22, color: '#ffdd44', marginTop: 12, display: 'flex' }}>
                🎯 миссия: {mission}
              </div>
            )}
          </div>

          {/* settings badge */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: '24px 28px',
            border: `2px solid ${accent}66`,
            background: `${accent}0d`,
            borderRadius: 24,
            minWidth: 240,
          }}>
            <div style={{ fontSize: 16, color: '#5a7a8a', display: 'flex' }}>НАСТРОЙКИ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', fontSize: 24, color: accent, fontWeight: 700 }}>
                {difficulty.toUpperCase()}
              </div>
              <div style={{ display: 'flex', fontSize: 20, color: '#e8f4f8' }}>ветер: {wind}</div>
              {code && (
                <div style={{ display: 'flex', fontSize: 16, color: '#5a7a8a', fontFamily: 'ui-monospace, monospace' }}>
                  replay: {code}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: 64,
          right: 64,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 20,
          color: '#5a7a8a',
        }}>
          <span style={{ display: 'flex' }}>интерактивный тренажёр яхтинга</span>
          <span style={{ display: 'flex', fontFamily: 'ui-monospace, monospace' }}>regatta.icoffio.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
