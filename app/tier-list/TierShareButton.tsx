"use client";

import { type RefObject, useState } from "react";

type Props = {
  targetRef: RefObject<HTMLElement | null>;
  filename?: string;
  title?: string;
};

export function TierShareButton({ targetRef, filename = "tier-list.png", title = "スレスパ2 Tier表" }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const capture = async () => {
    if (!targetRef.current || state === "loading") return;
    setState("loading");

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(targetRef.current, {
        backgroundColor: "#111827", // gray-900
        pixelRatio: 2,
        style: { borderRadius: "0" },
      });

      // Web Share API (モバイル対応)
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title });
          setState("done");
          setTimeout(() => setState("idle"), 2000);
          return;
        }
      }

      // フォールバック: ダウンロード
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("キャプチャ失敗:", err);
      setState("idle");
    }
  };

  return (
    <button
      onClick={capture}
      disabled={state === "loading"}
      className={`px-4 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
        state === "done"
          ? "bg-green-700 text-white"
          : "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
      }`}
    >
      {state === "loading" ? (
        <>
          <span className="inline-block w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          生成中...
        </>
      ) : state === "done" ? (
        "保存しました"
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          画像を保存
        </>
      )}
    </button>
  );
}
