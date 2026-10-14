"use client";

import { useEffect, useState } from "react";

const COLORS = ["#FFC21A", "#5B3DF5", "#13A36B", "#E5484D", "#1B1340"];

type Piece = { left: number; delay: number; duration: number; color: string; rotate: number };

// Lightweight CSS confetti. Hidden automatically when the user prefers reduced motion.
export default function Confetti({ count = 60 }: { count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    setPieces(
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
      }))
    );
    const timer = setTimeout(() => setPieces([]), 4500);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}vw`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
