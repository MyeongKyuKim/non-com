import React, { useEffect, useMemo, useRef, useState } from "react";

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
  const [bracketShiftX, setBracketShiftX] = useState(0);
  const messageRef = useRef(null);
  const bracketRef = useRef(null);

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

  const bracketIndex = text.indexOf("[");
  const hasBracket = bracketIndex >= 0;

  useEffect(() => {
    if (!hasBracket) {
      setBracketShiftX(0);
      return;
    }
    const container = messageRef.current;
    const bracket = bracketRef.current;
    if (!container || !bracket) return;

    const containerRect = container.getBoundingClientRect();
    const bracketRect = bracket.getBoundingClientRect();
    const currentBracketX = bracketRect.left - containerRect.left;
    const nextShift = bracketColumnPx - currentBracketX;

    if (Math.abs(nextShift - bracketShiftX) > 0.5) {
      setBracketShiftX(nextShift);
    }
  }, [hasBracket, text, bracketColumnPx, bracketShiftX]);

  const chars = useMemo(() => Array.from(text), [text]);

  const renderAnimatedChars = () =>
    chars.map((char, idx) => (
      <span
        key={`${char}-${idx}`}
        ref={idx === bracketIndex ? bracketRef : null}
        style={{
          display: "inline-block",
          color: "#f4f4f4",
          opacity: visible ? 0.8 : 0,
          transition: `opacity ${fadeMs}ms ease ${idx * 45}ms`,
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));

  if (!text) return null;

  return (
    <p
      ref={messageRef}
      style={{
        margin: "6px 0 0",
        fontSize: 32,
        whiteSpace: "nowrap",
        scrollMarginBlock: "40vh",
        transform: `translate(${offsetX + bracketShiftX}px, ${offsetY}px)`,
        width: "100%",
        textAlign: hasBracket ? "left" : "center",
        transition: `transform ${fadeMs}ms ease`,
      }}
    >
      {renderAnimatedChars()}
    </p>
  );
}
