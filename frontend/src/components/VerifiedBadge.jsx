import { useId } from "react";

// Badge "cont verificat" — insignă cu fundal degradat și bifă albă, gen IG/X
export default function VerifiedBadge({ size = 14, title = "Cont verificat" }) {
  const id = `vb-grad-${useId()}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4, flexShrink: 0 }}
      title={title}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4fc3f7" />
          <stop offset="100%" stopColor="#1da1f2" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M11 0l2.06 1.36 2.43-.36 1.06 2.2 2.2 1.06-.36 2.43L20 8.5l-1.61 1.81L20 12.12l-1.36 2.06.36 2.43-2.2 1.06-1.06 2.2-2.43-.36L11 21l-1.81-1.61L7.5 19.81l-1.06-2.2-2.43.36-1.06-2.2-2.2-1.06.36-2.43L0 11l1.61-1.81L0 8.5l1.36-2.06-.36-2.43 2.2-1.06 1.06-2.2 2.43.36L9 0l1.81 1.61z"
      />
      <path
        d="M6.5 11.2l2.9 2.9 6.1-6.4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
