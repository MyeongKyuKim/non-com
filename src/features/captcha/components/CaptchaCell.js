import React, { useEffect, useRef } from "react";
import { initHeatmapState, stepHeatmapN } from "../sim/dlgCore";

export default function CaptchaCell({
  index,
  isSelected = false,
  onClick,
  captureNonce = 0,
  onCaptured,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef(null);
  const lastTRef = useRef(0);

  // ✅ isSelected를 ref로 미러링 (effect 재시작 방지)
  const selectedRef = useRef(isSelected);
  useEffect(() => {
    selectedRef.current = isSelected;
  }, [isSelected]);

  // ✅ 시뮬/렌더 루프는 "마운트 1회"만
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const simW = 96;
    const simH = 96;

    const state = initHeatmapState({
      w: simW,
      h: simH,
      seed: 1000 + index * 97,
      walkers: 16,
      maxValue: 255,
    });
    stateRef.current = state;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    const drawAll = () => {
      const s = stateRef.current;
      if (!s) return;

      const scaleX = canvas.width / simW;
      const scaleY = canvas.height / simH;
      const pw = Math.max(1, Math.floor(scaleX));
      const ph = Math.max(1, Math.floor(scaleY));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < s.h; y++) {
        for (let x = 0; x < s.w; x++) {
          const k = y * s.w + x;
          const v = s.field[k];
          if (!v) continue;

          const a = Math.min(1, v / s.maxValue);
          const alpha = 0.02 + a * 0.35;
          ctx.fillStyle = `rgba(0,0,0,${alpha})`;
          ctx.fillRect(
            Math.floor(x * scaleX),
            Math.floor(y * scaleY),
            pw,
            ph
          );
        }
      }
    };

    const drawDirty = () => {
      const scaleX = canvas.width / simW;
      const scaleY = canvas.height / simH;
      const pw = Math.max(1, Math.floor(scaleX));
      const ph = Math.max(1, Math.floor(scaleY));

      const s = stateRef.current;
      for (const p of s.dirty) {
        const k = p.y * s.w + p.x;
        const v = s.field[k];
        const a = Math.min(1, v / s.maxValue);
        const alpha = 0.02 + a * 0.35;

        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(
          Math.floor(p.x * scaleX),
          Math.floor(p.y * scaleY),
          pw,
          ph
        );
      }
    };

    resizeCanvas();
    drawAll();

    const targetFps = 20;
    const frameInterval = 1000 / targetFps;

    const tick = (t) => {
      if (!lastTRef.current) lastTRef.current = t;
      const dt = t - lastTRef.current;

      if (dt >= frameInterval) {
        lastTRef.current = t;

        // ✅ 선택 상태면 step/draw를 건너뜀 (멈춤)
        if (!selectedRef.current) {
          const stepsPerFrame = 3;
          stepHeatmapN(stateRef.current, stepsPerFrame);
          drawDirty();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => {
      resizeCanvas();
      drawAll();
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [index]); // ✅ isSelected 제거!

  // ✅ 캡처 트리거(선택 순간)
// ✅ 캡처 트리거(선택 순간) — PNG Blob으로 저장
// ✅ 캡처 트리거(선택 순간) — 흰 배경 합성 후 PNG 저장
useEffect(() => {
  if (!captureNonce) return;
  const canvas = canvasRef.current;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;

  // 🔹 임시 오프스크린 캔버스 생성
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  if (!octx) return;

  // 🔹 1) 흰 배경 먼저 채우기
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, w, h);

  // 🔹 2) 기존 캔버스를 그 위에 합성
  octx.drawImage(canvas, 0, 0);

  // 🔹 3) PNG로 저장
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    onCaptured?.(index, url);

    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, "image/png");
}, [captureNonce, index, onCaptured]);



  return (
    <button
      type="button"
      onClick={() => onClick?.(index)}
      style={{
        aspectRatio: "1 / 1",
        width: "100%",
        border: isSelected
          ? "2px solid rgba(0,0,0,0.85)"
          : "1px solid rgba(0,0,0,0.15)",
        borderRadius: 10,
        background: isSelected ? "rgba(0,0,0,0.06)" : "transparent",
        cursor: "pointer",
        padding: 0,
        overflow: "hidden",
      }}
      aria-pressed={isSelected}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </button>
  );
}
