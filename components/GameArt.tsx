'use client';

/**
 * GameArt — the game's key art, displayed big.
 *
 * Known titles render their Steam CDN hero capsule. Unknown titles (or a CDN
 * failure) fall back to a stylized gradient tile with the game's initial —
 * so a night page always LOOKS like the game being offered, never like a
 * blank form. className controls sizing (e.g. "h-48 w-full sm:h-64").
 */

import { useState } from 'react';
import { gameArt } from '@/lib/game-art';

export default function GameArt({
  game,
  className = '',
}: {
  game: string;
  className?: string;
}) {
  const art = gameArt(game);
  const [failed, setFailed] = useState(false);

  if (art.src && !failed) {
    return (
      <div className={`relative overflow-hidden bg-montu-surface-2 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={art.src}
          alt={`${art.label} key art`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${art.hue}, 62%, 26%) 0%, hsl(${(art.hue + 60) % 360}, 68%, 12%) 100%)`,
      }}
      role="img"
      aria-label={`${art.label} artwork`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, hsla(${art.hue}, 90%, 65%, 0.5), transparent 45%), radial-gradient(circle at 80% 70%, hsla(${(art.hue + 60) % 360}, 90%, 60%, 0.4), transparent 45%)`,
        }}
      />
      <span className="display relative text-8xl font-bold text-white/30">{art.initial}</span>
    </div>
  );
}
