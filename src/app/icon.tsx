import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0f2035 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #00d4ff',
          borderRadius: '6px',
        }}
      >
        {/* A stylised sailboat */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
             stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 20l3.5-3.5" />
          <path d="M18 4l-6.5 6.5" />
          <path d="M2 20l8-2-6-6-2 8z" />
          <path d="M18 4l2 2-8 8" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
