import React from "react";
import CaptchaHeader from "../../features/captcha/components/CaptchaHeader";
import CaptchaGrid from "../../features/captcha/components/CaptchaGrid";
import ResponsiveFrame from "../../shared/components/ResponsiveFrame";

export default function CaptchaPage() {
  return (
    <ResponsiveFrame maxWidth={680}>
      <CaptchaHeader />
      <CaptchaGrid size={4} />
    </ResponsiveFrame>
  );
}
