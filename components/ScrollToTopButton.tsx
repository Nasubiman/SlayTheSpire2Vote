"use client";

import { useEffect, useState } from "react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="ページ上部へ戻る"
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-gray-700 hover:bg-gray-600 text-white shadow-lg flex items-center justify-center transition-colors"
    >
      ↑
    </button>
  );
}
