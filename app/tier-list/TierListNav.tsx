"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "カード", href: "/tier-list" },
  { label: "レリック", href: "/tier-list/relics" },
  { label: "敵キャラ", href: "/tier-list/enemies" },
];

export function TierListNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 mb-6">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
            pathname === tab.href
              ? "bg-white text-gray-900"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
