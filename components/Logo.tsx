import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_15px_rgba(41,98,255,0.6)]"
      >
        <path
          d="M50 15L15 85H35L50 55L65 85H85L50 15Z"
          fill="url(#paint0_linear)"
        />
        <path
          d="M50 45V75"
          stroke="url(#paint1_linear)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M40 55L50 45L60 55"
          stroke="url(#paint2_linear)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient
            id="paint0_linear"
            x1="15"
            y1="85"
            x2="85"
            y2="15"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#2962FF" />
            <stop offset="0.5" stopColor="#00E5FF" />
            <stop offset="1" stopColor="#2962FF" />
          </linearGradient>
          <linearGradient
            id="paint1_linear"
            x1="50"
            y1="75"
            x2="50"
            y2="45"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
          <linearGradient
            id="paint2_linear"
            x1="40"
            y1="55"
            x2="60"
            y2="55"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};