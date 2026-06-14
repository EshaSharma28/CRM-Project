import React from 'react';

export const Bean = ({ className = "w-6 h-6", ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <g transform="rotate(-30 12 12)">
      <ellipse cx="12" cy="12" rx="6" ry="10" />
      <path d="M12 2 C16 8, 8 16, 12 22" />
    </g>
  </svg>
);

export const SolidBean = ({ className = "w-6 h-6", crackColor = "#F0EBE1", ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} {...props}>
    <g transform="rotate(-30 12 12)">
      <ellipse cx="12" cy="12" rx="6" ry="10" />
      <path d="M12 2 C16 8, 8 16, 12 22" stroke={crackColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
  </svg>
);

export const LonelyBean = ({ className = "w-12 h-12", ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <g transform="rotate(-30 12 12)">
      <ellipse cx="12" cy="12" rx="6" ry="10" />
      <path d="M12 2 C16 8, 8 16, 12 22" />
      {/* Sad face */}
      <path d="M9 10h.01M15 10h.01M10 18c.5-.5 1.5-.5 2 0" />
    </g>
  </svg>
);

export const MascotFace = ({ className = "w-8 h-8", ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <g transform="rotate(-30 12 12)">
      {/* Bean shape */}
      <ellipse cx="12" cy="12" rx="6" ry="10" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 2 C16 8, 8 16, 12 22" strokeOpacity="0.3" />
      {/* Happy face */}
      <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M10 17c1 1 3 1 4 0" />
    </g>
  </svg>
);

export const Cup = ({ className = "w-12 h-12", ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
  </svg>
);

export const SteamWisp = ({ className = "w-4 h-4", ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M8 16c0-4 4-4 4-8s-4-4-4-8" className="animate-steam" />
    <path d="M16 20c0-4-4-4-4-8s4-4 4-8" className="animate-steam" style={{ animationDelay: '0.5s' }} />
  </svg>
);

export const SteamingCup = ({ className = "w-12 h-12", ...props }) => (
  <div className={`relative flex flex-col items-center justify-center ${className}`}>
    <div className="flex justify-center opacity-60 mb-[-12px] z-10 w-full h-1/2">
      <SteamWisp className="w-full h-full" />
    </div>
    <Cup className="w-full h-full" {...props} />
  </div>
);

export const PourOver = ({ className = "w-32 h-32", ...props }) => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Dripper Cone */}
    <path d="M16 12L24 36H40L48 12Z" />
    <path d="M22 36C22 36 28 42 32 42C36 42 42 36 42 36" />
    <line x1="32" y1="42" x2="32" y2="46" />
    {/* Base Carafe */}
    <path d="M26 46C20 46 16 52 16 58H48C48 52 44 46 38 46" />
    {/* Filter paper ridge */}
    <line x1="20" y1="12" x2="28" y2="36" strokeDasharray="2 2" opacity="0.5" />
    <line x1="12" y1="12" x2="52" y2="12" />
  </svg>
);

export const CoffeeRing = ({ className = "w-64 h-64", ...props }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="50" cy="50" r="40" opacity="0.1" />
    <circle cx="48" cy="52" r="39" opacity="0.05" strokeWidth="2" />
    <circle cx="51" cy="49" r="41" opacity="0.03" strokeWidth="3" />
    {/* Splatter dots */}
    <circle cx="8" cy="40" r="1" fill="currentColor" opacity="0.1" stroke="none" />
    <circle cx="85" cy="70" r="0.5" fill="currentColor" opacity="0.05" stroke="none" />
    <circle cx="40" cy="95" r="1.5" fill="currentColor" opacity="0.08" stroke="none" />
  </svg>
);
