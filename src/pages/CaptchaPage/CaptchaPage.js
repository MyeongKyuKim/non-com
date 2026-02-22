import React, { useMemo } from "react";
import CaptchaHeader from "../../features/captcha/components/CaptchaHeader";
import CaptchaGrid from "../../features/captcha/components/CaptchaGrid";
import ResponsiveFrame from "../../shared/components/ResponsiveFrame";

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

export default function CaptchaPage() {
  const target = useMemo(
    () => CAPTCHA_TARGETS[Math.floor(Math.random() * CAPTCHA_TARGETS.length)],
    []
  );

  return (
    <ResponsiveFrame maxWidth={680}>
      <CaptchaHeader subtitle={`[${target}]가 있는 타일을 선택하세요`} />
      <CaptchaGrid size={4} previewLabel={target} />
    </ResponsiveFrame>
  );
}
