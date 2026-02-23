import React, { useEffect, useMemo, useRef, useState } from "react";
import CaptchaCell from "./CaptchaCell";
import DelayedMessage from "./DelayedMessage";
import { PREVIEW_DELAYED_MESSAGES } from "../constants/messages";

const BRACKET_COLUMN_PX = 112;
const PREVIEW_TARGET_STYLE = {
  fontSize: 17,
  lineHeight: 1.2,
  fontWeight: "bold",
  color: "#111827",
};

export default function CaptchaGrid({ size = 4, previewLabel = "" }) {
  const cells = useMemo(
    () => Array.from({ length: size * size }, (_, i) => i),
    [size]
  );
  const [selected, setSelected] = useState(() => new Set());

  const [captureNonce, setCaptureNonce] = useState(0);
  const [captureTarget, setCaptureTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const previewRef = useRef(null);

  // ✅ "한 번만" 다운로드 보장: index별로 이미 저장했는지 기억
  const downloadedRef = useRef(new Set());

  const toggleCell = (index) => {
    const wasSelected = selected.has(index);
    const willSelect = !wasSelected;

    setSelected((prev) => {
      const next = new Set(prev);
      if (willSelect) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });

    if (willSelect) {
      // ✅ 선택되는 순간 캡처 트리거 (updater 외부)
      setCaptureTarget(index);
      setCaptureNonce((n) => n + 1);
    }
  };

  const [uploadStatus, setUploadStatus] = useState("");

  const blobUrlToDataUrl = async (blobUrl) => {
    const blob = await fetch(blobUrl).then((r) => r.blob());
    const result = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    if (typeof result !== "string") {
      throw new Error("Failed to convert image payload");
    }
    return result;
  };

  const uploadCapture = async ({ index, blobUrl, filename }) => {
    const dataUrl = await blobUrlToDataUrl(blobUrl);

    const res = await fetch("/api/capture-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        dataUrl,
        cellIndex: index + 1,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.detail || json?.error || "Upload failed");
    }

    return { ...json, dataUrl };
  };

  // ✅ 파일명 규칙: non-com_cell-05_20260203-152045.png
  const makeFilename = (index) => {
    const pad2 = (n) => String(n).padStart(2, "0");

    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());

    const cell = pad2(index + 1);
    return `non-com_cell-${cell}_${yyyy}${mm}${dd}-${hh}${mi}${ss}.png`;
  };

  const handleCaptured = async (index, blobUrl) => {
    // ✅ 이미 다운로드 했으면 무시 (한 번만)
    if (downloadedRef.current.has(index)) return;

    downloadedRef.current.add(index);
    const filename = makeFilename(index);

    setUploadStatus(`셀 ${index + 1} 업로드 중...`);

    try {
      const result = await uploadCapture({ index, blobUrl, filename });
      setUploadStatus("");
      setPreview({
        index,
        dataUrl: result.dataUrl,
      });
    } catch (error) {
      downloadedRef.current.delete(index);
      setUploadStatus(`셀 ${index + 1} 업로드 실패: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!preview?.dataUrl) return;
    previewRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [preview?.dataUrl]);

  return (
    <section
      style={{
        padding: 16,
        paddingBottom: preview?.dataUrl ? "45vh" : 16,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: 10,
          width: "min(520px, 100%)",
        }}
      >
        {cells.map((i) => (
          <CaptchaCell
            key={i}
            index={i}
            isSelected={selected.has(i)}
            onClick={toggleCell}
            captureNonce={captureTarget === i ? captureNonce : 0}
            onCaptured={handleCaptured}
          />
        ))}
      </div>
      <div style={{ width: "min(260px, 100%)" }}>
        {preview?.dataUrl ? (
          <>
            <img
              ref={previewRef}
              src={preview.dataUrl}
              alt={`셀 ${preview.index + 1} 확대 미리보기`}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                objectFit: "contain",
                scrollMarginBlock: "40vh",
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 10,
                background: "#fff",
                display: "block",
              }}
            />
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 12,
                wordBreak: "break-all",
                width: "100%",
                textAlign: "left",
              }}
            >
              {previewLabel ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: BRACKET_COLUMN_PX,
                      textAlign: "right",
                    }}
                  />
                  <span style={PREVIEW_TARGET_STYLE}>{`[${previewLabel}]`}</span>
                </>
              ) : (
                ""
              )}
            </p>
            {PREVIEW_DELAYED_MESSAGES.map((messageConfig, idx) => {
              const tokenValue = previewLabel ? `[${previewLabel}]` : "[]";
              const messageText = messageConfig.text.replaceAll(
                "[%const CAPTCHA_TARGETS]",
                tokenValue
              );
              return (
                <DelayedMessage
                  key={`${messageConfig.text}-${idx}`}
                  text={messageText}
                  triggerKey={preview.dataUrl}
                  delayMs={2000 + idx * 2000}
                  fadeMs={420}
                  offsetX={messageConfig.offsetX}
                  offsetY={messageConfig.offsetY}
                  fontSize={messageConfig.fontSize}
                  bracketColumnPx={BRACKET_COLUMN_PX}
                />
              );
            })}
          </>
        ) : (
          uploadStatus ? <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>{uploadStatus}</p> : null
        )}
      </div>
    </section>
  );
}
