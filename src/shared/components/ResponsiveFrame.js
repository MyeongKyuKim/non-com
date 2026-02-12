import React from "react";

export default function ResponsiveFrame({ children, maxWidth = 720 }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth }}>{children}</div>
    </div>
  );
}
