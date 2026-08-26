import type { SVGProps } from "react";

export type CardTypeIconKind = "pan" | "aadhaar" | "ration" | "ayushman" | "custom";

interface CardTypeIconProps extends SVGProps<SVGSVGElement> {
  kind: CardTypeIconKind;
}

const baseProps = {
  viewBox: "0 0 96 64",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  role: "img",
};

const officialMarks: Partial<Record<CardTypeIconKind, string>> = {
  aadhaar: "/official-card-marks/aadhaar.webp",
  pan: "/official-card-marks/pan.webp",
  ration: "/official-card-marks/ration.jpg",
  ayushman: "/official-card-marks/ayushman.png",
};

export const CardTypeIcon = ({ kind, ...props }: CardTypeIconProps) => {
  const officialMark = officialMarks[kind];
  if (officialMark) {
    return (
      <svg {...baseProps} {...props} aria-label={`${kind} official card mark`}>
        <rect x="3" y="3" width="90" height="58" rx="12" fill="#fff" stroke="currentColor" strokeOpacity=".2" strokeWidth="2" />
        <image href={officialMark} x="8" y="8" width="80" height="48" preserveAspectRatio="xMidYMid meet" />
      </svg>
    );
  }

  if (kind === "aadhaar") {
    return (
      <svg {...baseProps} {...props} aria-label="Aadhaar card icon">
        <defs><linearGradient id="aadhaar-card" x1="8" y1="7" x2="88" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF7EC" /><stop offset="1" stopColor="#FFE3C2" /></linearGradient></defs>
        <rect x="3" y="3" width="90" height="58" rx="12" fill="url(#aadhaar-card)" stroke="#E56A2E" strokeWidth="2" />
        <circle cx="23" cy="27" r="12" fill="#E56A2E" opacity=".14" />
        <path d="M23 16c-5.4 0-9.8 4.4-9.8 9.8M23 20.4c-3 0-5.4 2.4-5.4 5.4M23 24.3c-.9 0-1.7.7-1.7 1.7 0 4 2.4 7.4 5.8 9.1M23 28.2c0 5.1 3.2 9.2 7.7 10.7M23 16c5.4 0 9.8 4.4 9.8 9.8M28.4 25.8c0 3-1.5 5.5-3.6 6.9" stroke="#E56A2E" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M41 18h37M41 25h25M41 34h30M41 41h18" stroke="#B96C35" strokeWidth="2.2" strokeLinecap="round" opacity=".8" />
        <path d="M15 48h64" stroke="#E56A2E" strokeWidth="1.5" opacity=".45" />
        <text x="41" y="54" fill="#B95426" fontSize="6" fontWeight="700" letterSpacing=".8">AADHAAR</text>
      </svg>
    );
  }

  if (kind === "pan") {
    return (
      <svg {...baseProps} {...props} aria-label="PAN card icon">
        <defs><linearGradient id="pan-card" x1="6" y1="4" x2="90" y2="61" gradientUnits="userSpaceOnUse"><stop stopColor="#EAF5FF" /><stop offset="1" stopColor="#B9D8F5" /></linearGradient></defs>
        <rect x="3" y="3" width="90" height="58" rx="12" fill="url(#pan-card)" stroke="#2377B8" strokeWidth="2" />
        <path d="M14 14h68" stroke="#2377B8" strokeWidth="2" opacity=".35" />
        <circle cx="22" cy="27" r="9" fill="#2377B8" opacity=".15" />
        <path d="M22 20l2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7L22 20Z" fill="#2377B8" />
        <path d="M38 22h40M38 29h31M14 43h64" stroke="#1A5E94" strokeWidth="2.2" strokeLinecap="round" opacity=".75" />
        <text x="38" y="52" fill="#1A5E94" fontSize="6" fontWeight="700" letterSpacing=".9">PAN CARD</text>
      </svg>
    );
  }

  if (kind === "ration") {
    return (
      <svg {...baseProps} {...props} aria-label="Ration card icon">
        <defs><linearGradient id="ration-card" x1="8" y1="6" x2="88" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor="#F0FFF7" /><stop offset="1" stopColor="#BFEED8" /></linearGradient></defs>
        <rect x="3" y="3" width="90" height="58" rx="12" fill="url(#ration-card)" stroke="#179C6B" strokeWidth="2" />
        <path d="M17 39c0-5.2 4.2-9.4 9.4-9.4s9.4 4.2 9.4 9.4M22 27.2a4.4 4.4 0 1 1 8.8 0M14 43h27" stroke="#13865C" strokeWidth="2" strokeLinecap="round" />
        <path d="M52 20c0 10 3 15 8 22M60 20c0 10-3 15-8 22M56 19v27M68 28c-4 5-5 10-4 17M76 28c-4 5-5 10-4 17" stroke="#179C6B" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M47 48h34" stroke="#13865C" strokeWidth="2" strokeLinecap="round" opacity=".65" />
        <text x="14" y="54" fill="#13865C" fontSize="6" fontWeight="700" letterSpacing=".7">RATION CARD</text>
      </svg>
    );
  }

  if (kind === "ayushman") {
    return (
      <svg {...baseProps} {...props} aria-label="Ayushman Bharat card icon">
        <defs><linearGradient id="ayushman-card" x1="4" y1="4" x2="92" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF3E7" /><stop offset="1" stopColor="#FFD4B1" /></linearGradient></defs>
        <rect x="3" y="3" width="90" height="58" rx="12" fill="url(#ayushman-card)" stroke="#E87522" strokeWidth="2" />
        <circle cx="22" cy="29" r="12" fill="#E87522" opacity=".13" />
        <path d="M22 22v14M15 29h14" stroke="#E87522" strokeWidth="4" strokeLinecap="round" />
        <path d="M40 20h39M40 28h27M40 37h34M40 46h24" stroke="#C85F1D" strokeWidth="2.2" strokeLinecap="round" opacity=".8" />
        <path d="M14 49c5-3 10-3 15 0" stroke="#E87522" strokeWidth="1.8" strokeLinecap="round" />
        <text x="40" y="55" fill="#C85F1D" fontSize="5.6" fontWeight="700" letterSpacing=".4">AYUSHMAN CARD</text>
      </svg>
    );
  }

  return (
    <svg {...baseProps} {...props} aria-label="Custom ID card icon">
      <defs><linearGradient id="custom-card" x1="7" y1="4" x2="91" y2="61" gradientUnits="userSpaceOnUse"><stop stopColor="#F3F1FF" /><stop offset="1" stopColor="#DAD5FF" /></linearGradient></defs>
      <rect x="3" y="3" width="90" height="58" rx="12" fill="url(#custom-card)" stroke="#6E63C5" strokeWidth="2" />
      <circle cx="23" cy="28" r="10" fill="#6E63C5" opacity=".15" />
      <circle cx="23" cy="25" r="3.8" fill="#6E63C5" />
      <path d="M16 37c1.5-4.7 12.5-4.7 14 0" stroke="#6E63C5" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 21h36M42 29h29M42 38h33M42 47h20" stroke="#5850A3" strokeWidth="2.2" strokeLinecap="round" opacity=".78" />
      <text x="15" y="53" fill="#5850A3" fontSize="6" fontWeight="700" letterSpacing=".8">CUSTOM ID</text>
    </svg>
  );
};
