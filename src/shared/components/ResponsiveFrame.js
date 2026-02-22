import React from "react";

export default function ResponsiveFrame({ children, maxWidth = 720 }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        backgroundColor: "#e9f8ea",
        backgroundImage:
          "linear-gradient(160deg, #e7f8e7 0%, #7fc1a2 45%, #114f23 100%)",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth }}>{children}</div>
    </div>
  );
}
