import React, { useMemo } from "react";

const CAPTCHA_TARGETS = [
  "자동차",
  "버스",
  "자전거",
  "오토바이",
  "트럭",
  "신호등",
  "횡단보도",
  "소화전",
  "다리",
  "계단",
];

export default function CaptchaHeader({
  title = "CAPTCHA Voyager",
  subtitle,
}) {
  const randomSubtitle = useMemo(() => {
    const target = CAPTCHA_TARGETS[Math.floor(Math.random() * CAPTCHA_TARGETS.length)];
    return `[${target}]가 있는 타일을 모두 선택하세요`;
  }, []);

  return (
    <header style={{ padding: "16px 16px 12px", width: "min(520px, 100%)", margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>{title}</h1>
      <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: 13 }}>
        {subtitle || randomSubtitle}
      </p>
    </header>
  );
}
