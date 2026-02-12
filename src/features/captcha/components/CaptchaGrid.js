import React, { useMemo, useRef, useState } from "react";
import CaptchaCell from "./CaptchaCell";

export default function CaptchaGrid({ size = 4 }) {
  const cells = useMemo(
    () => Array.from({ length: size * size }, (_, i) => i),
    [size]
  );
  const [selected, setSelected] = useState(() => new Set());

  const [captureNonce, setCaptureNonce] = useState(0);
  const [captureTarget, setCaptureTarget] = useState(null);

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

    return json;
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
      setUploadStatus(`셀 ${index + 1} 업로드 완료: ${result.path}`);
    } catch (error) {
      downloadedRef.current.delete(index);
      setUploadStatus(`셀 ${index + 1} 업로드 실패: ${error.message}`);
    }
  };

  return (
    <section style={{ padding: 16, display: "flex", justifyContent: "center" }}>
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
      {uploadStatus ? (
        <p style={{ margin: "12px auto 0", width: "min(520px, 100%)", fontSize: 13, opacity: 0.75 }}>
          {uploadStatus}
        </p>
      ) : null}
    </section>
  );
}
