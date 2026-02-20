import React, { useEffect, useRef, useState } from "react";

export default function DelayedMessage({
  text = "",
  triggerKey = "",
  delayMs = 3000,
  fadeMs = 420,
}) {
  const [visible, setVisible] = useState(false);
  const messageRef = useRef(null);

  useEffect(() => {
    if (!text || !triggerKey) {
      setVisible(false);
      return;
    }

    setVisible(false);
    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [text, triggerKey, delayMs]);

  useEffect(() => {
    if (!visible) return;
    const el = messageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const targetTop = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }, [visible]);

  if (!text) return null;

  return (
    <p
      ref={messageRef}
      style={{
        margin: "6px 0 0",
        fontSize: 32,
        scrollMarginBlock: "40vh",
        opacity: visible ? 0.8 : 0,
        textAlign: "center",
        transition: `opacity ${fadeMs}ms ease`,
      }}
    >
      {text}
    </p>
  );
}
