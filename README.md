## サイト

https://slaythespire2vote.vercel.app/

# Slay the Spire 2 カード強さ投票サイト

[Slay the Spire 2](https://store.steampowered.com/app/1868140/Slay_the_Spire_2/) のカードを **S / A / B / C / D** の5段階で評価できる投票サイトです。

キャラクターごとにカード一覧を表示し、各カードに対してみんなの評価をリアルタイムで確認できます。

## 機能

- キャラクター別カード一覧（アイアンクラッド / サイレント / ディフェクト / ネクロバインダー / リージェント）
- カードタイプ（アタック / スキル / パワー）でフィルタリング
- S〜Dの5段階評価で投票
- 投票結果をリアルタイム表示（棒グラフで分布確認）
- 同一IPからの重複投票を防止
- カード画像表示

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) / Tailwind CSS |
| ホスティング | Vercel |
| データベース | Firebase Firestore |
| 画像配信 | Vercel Blob |
| 投票API | Next.js API Routes |

## 免責事項

- カード画像・カード名は [Slay the Spire 2](https://store.steampowered.com/app/1868140/Slay_the_Spire_2/) (MegaCrit) の著作物です
- 本サイトは非公式のファンサイトであり、MegaCrit とは一切関係ありません
- 商用利用は行っていません
