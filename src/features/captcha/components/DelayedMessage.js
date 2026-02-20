import React, { useEffect, useState } from "react";

export default function DelayedMessage({
  text = "",
  triggerKey = "",
  delayMs = 3000,
  fadeMs = 420,
}) {
  const [visible, setVisible] = useState(false);

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

  if (!text) return null;

  return (
    <p
      style={{
        margin: "6px 0 0",
        fontSize: 32,
        opacity: visible ? 0.8 : 0,
        textAlign: "center",
        transition: `opacity ${fadeMs}ms ease`,
      }}
    >
      {text}
    </p>
  );
}
