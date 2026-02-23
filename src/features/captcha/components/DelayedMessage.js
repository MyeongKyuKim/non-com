import React, { useEffect, useRef, useState } from "react";

export default function DelayedMessage({
  text = "",
  triggerKey = "",
  delayMs = 3000,
  fadeMs = 420,
  offsetX = 0,
  offsetY = 0,
  bracketColumnPx = 112,
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

  const bracketIndex = text.indexOf("[");
  const hasBracket = bracketIndex >= 0;
  const prefixText = hasBracket ? text.slice(0, bracketIndex) : "";
  const bracketText = hasBracket ? text.slice(bracketIndex) : text;

  const renderAnimatedChars = (value, startIdx = 0) =>
    Array.from(value).map((char, idx) => (
      <span
        key={`${char}-${startIdx + idx}`}
        style={{
          display: "inline-block",
          color: "#f4f4f4",
          opacity: visible ? 0.8 : 0,
          transition: `opacity ${fadeMs}ms ease ${(startIdx + idx) * 45}ms`,
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));

  return (
    <p
      ref={messageRef}
      style={{
        margin: "6px 0 0",
        fontSize: 32,
        whiteSpace: "nowrap",
        scrollMarginBlock: "40vh",
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        width: "100%",
        textAlign: hasBracket ? "left" : "center",
        transition: `transform ${fadeMs}ms ease`,
      }}
    >
      {hasBracket ? (
        <>
          <span
            style={{
              display: "inline-block",
              width: bracketColumnPx,
              textAlign: "right",
            }}
          >
            {renderAnimatedChars(prefixText, 0)}
          </span>
          <span>{renderAnimatedChars(bracketText, prefixText.length)}</span>
        </>
      ) : (
        renderAnimatedChars(text, 0)
      )}
    </p>
  );
}
