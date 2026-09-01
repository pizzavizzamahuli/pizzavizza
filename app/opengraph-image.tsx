import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #fdba74 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 64,
          color: '#7c2d12',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700 }}>Pizza Vizza</div>
        <div style={{ fontSize: 28, marginTop: 16 }}>Restaurant platform foundation</div>
      </div>
    ),
    size,
  );
}
