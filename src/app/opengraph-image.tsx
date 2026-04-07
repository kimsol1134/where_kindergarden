import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const dynamic = 'force-static';

export const alt = '우리동네 유치원 - 내 주변 유치원 검색 및 비교';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  const iconData = await readFile(join(process.cwd(), 'public', 'icon.png'));
  const iconBase64 = `data:image/png;base64,${iconData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafdf8',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Sun glow — top right (iOS splash style) */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            background:
              'radial-gradient(circle, rgba(242, 213, 111, 0.18) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Subtle green glow — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-120px',
            left: '-80px',
            width: '360px',
            height: '360px',
            background:
              'radial-gradient(circle, rgba(102, 183, 116, 0.08) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            zIndex: 1,
          }}
        >
          {/* App icon */}
          <img
            src={iconBase64}
            width={112}
            height={112}
            style={{
              borderRadius: '28px',
              boxShadow: '0 12px 40px rgba(102, 183, 116, 0.18)',
            }}
          />

          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                fontSize: '52px',
                fontWeight: 800,
                color: '#2D5A3D',
                letterSpacing: '-1px',
                lineHeight: 1.2,
              }}
            >
              우리동네 유치원
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 500,
                color: '#9DB89A',
                letterSpacing: '0.3px',
              }}
            >
              우리 아이 첫 유치원, 쉽고 똑똑하게 비교하세요
            </div>
          </div>

          {/* Feature tags */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '12px',
            }}
          >
            {['내 주변 유치원 검색', '한눈에 비교', '학부모 후기'].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 18px',
                    borderRadius: '18px',
                    background: 'rgba(102, 183, 116, 0.10)',
                    color: '#3c8757',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
