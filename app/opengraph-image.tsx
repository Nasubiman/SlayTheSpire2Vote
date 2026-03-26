import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0f1a 0%, #1a0a0a 50%, #0a0f1a 100%)",
        }}
      >
        {/* 装飾ライン */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #7f1d1d, #6d28d9, #1e3a5f)",
          }}
        />

        {/* サブタイトル */}
        <div
          style={{
            fontSize: 28,
            color: "#9ca3af",
            letterSpacing: "0.15em",
            marginBottom: 16,
            display: "flex",
          }}
        >
          Slay the Spire 2 非公式ファンサイト
        </div>

        {/* メインタイトル */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>スレスパ2</span>
          <span style={{ fontSize: 48, color: "#d1d5db", marginTop: 8 }}>
            カード・レリック 評価ランキング
          </span>
        </div>

        {/* 説明文 */}
        <div
          style={{
            fontSize: 28,
            color: "#6b7280",
            marginTop: 32,
            display: "flex",
          }}
        >
          みんなで投票する最強カード Tier 表
        </div>

        {/* タグ */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
          }}
        >
          {["カード", "レリック", "敵キャラ"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "6px 20px",
                borderRadius: 9999,
                border: "1px solid #374151",
                color: "#9ca3af",
                fontSize: 22,
                display: "flex",
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* 下部ライン */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #1e3a5f, #6d28d9, #7f1d1d)",
          }}
        />
      </div>
    ),
    size
  );
}
