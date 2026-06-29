import { ImageResponse } from 'next/og';

export const alt = 'Regatta - Interactive sailing trainer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: 22,
          color: '#00d4ff',
          marginBottom: 20,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20l3.5-3.5" />
            <path d="M18 4l-6.5 6.5" />
            <path d="M2 20l8-2-6-6-2 8z" />
            <path d="M18 4l2 2-8 8" />
          </svg>
          <span>REGATTA · SAILING TRAINER</span>
        </div>

        {/* Main headline */}
        <div style={{
          display: 'flex',
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          marginBottom: 28,
          color: '#ffffff',
        }}>
          До регаты неделя?
        </div>

        <div style={{
          display: 'flex',
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1.0,
          color: '#00d4ff',
          marginBottom: 34,
        }}>
          Успеешь разобраться.
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 12, fontSize: 24, color: '#8ba7b8' }}>
          <div style={{
            padding: '8px 18px',
            border: '1px solid rgba(0, 212, 255, 0.35)',
            borderRadius: 999,
            color: '#00d4ff',
          }}>45 мин</div>
          <div style={{
            padding: '8px 18px',
            border: '1px solid rgba(139, 167, 184, 0.35)',
            borderRadius: 999,
          }}>AI-тренер</div>
          <div style={{
            padding: '8px 18px',
            border: '1px solid rgba(139, 167, 184, 0.35)',
            borderRadius: 999,
          }}>Гонка с соперниками</div>
          <div style={{
            padding: '8px 18px',
            border: '1px solid rgba(139, 167, 184, 0.35)',
            borderRadius: 999,
          }}>RU / EN / PL</div>
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
    { ...size },
  );
}
