# 作業ログ: AIコンテンツ工房 フェーズ2 — 全工程自動化＋並行運転設計

- 日時: 2026-07-19 08:50
- ブランチ: claude/claude-code-subscription-monetization-fw295g

## 目的

「アカウント作成からすべて自動化」の要望に対応。自動化不能な工程（アカウント登録・最終クリック＝本人確認と各社規約の制約）はコピペキット化し、それ以外の制作工程を完全自動化。あわせて複数プロジェクト並行運転の設計を導入。

## 実施内容

1. **制作パイプライン**（`scripts/`・動作検証済み）
   - `make_cover.py`: cover.json → 表紙PNG 2560×1600 ＋ 160px サムネイル自動生成（ヘッドレス Chromium 直叩き、縮小は Pillow）
   - `build_book.py`: chapters/*.md ＋ book.yaml → EPUB3 自動ビルド（標準ライブラリで手組み、mimetype/OPF/nav 構造検証つき）
   - `make_publish_kit.py`: book.yaml → KDP 入稿フォーム全項目のコピペキット（AI-generated 申告手順入り）
   - book-01（企画案A仮値＋サンプル2章）で通し検証: EPUB 159KB 検証パス、表紙・サムネイル目視OK
2. **アカウント開設キット**（`setup/`）: Google（専用アカウント）→ KDP → ココナラ の順のコピペ手順書3本。各15分・1回だけ。自動化しない理由（本人確認・規約・凍結リスク）を各冒頭に明記
3. **複数プロジェクト並行運転**: `projects/portfolio.md` レジストリ新設（追加は「ディレクトリ＋progress.md＋1行」だけ）。progress.md を共通フォーマット化。SKILL.md をポートフォリオ横断運転に改修（グローバル制約: ユーザー週5時間・受託全体1件）

## 技術メモ

- Chromium headless の `transform: scale()` は極小スケールでタイルの一部しかラスタライズされない（--run-all-compositor-stages-before-draw でも解消せず）。サムネイル縮小は Pillow で実施
- Python 3.11 の f-string はバックスラッシュ不可 → 正規表現置換は変数に退避

## 残るユーザー作業（設計上の最小値）

- アカウント開設3件（ガイド沿い・計45分・1回だけ）
- KDP入稿コピペ（15分/冊）、ココナラ操作（都度）
- 企画案A承認とペンネーム決定
