import React from "react";

export default function ChartSpinner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      id="chart-spinner"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.3)",
        zIndex: 10,
      }}
    >
      <div
        className="spinner"
        style={{
          width: 48,
          height: 48,
          border: "6px solid #ccc",
          borderTop: "6px solid #007bff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}