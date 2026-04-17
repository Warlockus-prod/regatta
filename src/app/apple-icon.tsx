import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          border: '4px solid #00d4ff',
          borderRadius: '40px',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none"
             stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
