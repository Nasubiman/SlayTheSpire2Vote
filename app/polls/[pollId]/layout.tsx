import type { Metadata } from "next";

const CHARACTER_NAMES: Record<string, string> = {
  ironclad: "アイアンクラッド",
  silent: "サイレント",
  defect: "ディフェクト",
  necro: "ネクロバインダー",
  regent: "リージェント",
  colorless: "無色",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pollId: string }>;
}): Promise<Metadata> {
  const { pollId } = await params;
  const charName = CHARACTER_NAMES[pollId] ?? pollId;
  const title = `${charName} カード強さ評価ランキング | スレスパ2 (STS2) カード・レリック投票`;
  const description = `スレスパ2（Slay the Spire 2 / STS2）${charName}の全カード強さ評価ランキング。みんなの投票で決まる最強カードTier表を確認しよう。`;

  return {
    title,
    description,
    openGraph: {
      title: `STS2 ${charName} カード強さ評価ランキング`,
      description,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
