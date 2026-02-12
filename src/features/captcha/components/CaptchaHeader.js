import React from "react";

export default function CaptchaHeader({
  title = "CAPTCHA Voyager",
  subtitle = "[자전거]와 가장 비슷한 이미지를 선택해주세요",
}) {
  return (
    <header style={{ padding: "16px 16px 12px", width: "min(520px, 100%)", margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>{title}</h1>
      <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: 13 }}>
        {subtitle}
      </p>
    </header>
  );
}