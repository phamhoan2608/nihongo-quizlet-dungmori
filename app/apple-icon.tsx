import { ImageResponse } from "next/og";

// Apple touch icon PNG cho iOS Home screen — không hỗ trợ SVG tốt bằng browser tab
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#4F52C8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 128,
          fontWeight: 700,
          fontFamily: "sans-serif",
          borderRadius: 40,
        }}
      >
        あ
      </div>
    ),
    { ...size }
  );
}
