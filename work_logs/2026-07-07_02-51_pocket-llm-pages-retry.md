# 作業ログ: Pocket LLM — GitHub Pages デプロイ失敗の再調査・再トリガー

- **日時**: 2026-07-07 02:51
- **関連PR**: #14 のデプロイが GitHub Pages 側で失敗していた件の対応

## 事象

PR #14 マージ後、ユーザーがシークレットタブで確認しても新モデル一覧(Gemma既定)が
表示されず、PR #13 時点の古い内容(Qwen2.5 3B既定)のままだった。

## 調査

- `gh-pages` ブランチの中身は最新(新しいハッシュ付きJS `index-CSKX9WIl.js`)であることを
  `get_file_contents` で確認 → **配信元コンテンツは正しく更新済み**。
- ブラウザ側キャッシュ/Service Workerが原因ではないことをシークレットタブで確認済みだった
  ため、GitHub Pages 自体のビルド状況を調査。
- リポジトリの内部ワークフロー `pages-build-deployment`(GitHub自動生成、
  `actions/deploy-pages@v5` 使用)のログを確認した結果:
  - PR #13 分(commit 60729667): success
  - **PR #14 分(commit 09a2068e): failure** — ログに `Deployment failed, try again later.`
- → **GitHub Pages 側の一時的なデプロイエラー**で、gh-pagesブランチは最新なのに
  実際の配信内容だけが1つ前のバージョンで止まっていたことが根本原因と判明。
  ブラウザ/CDNキャッシュの問題ではなかった。

## 対応

- 自作ワークフロー `deploy-pocket-llm.yml` を `workflow_dispatch` で再実行しようとしたが、
  GITHUB_TOKEN の権限不足で `403 Resource not accessible by integration`。
- 代替として、master への軽微な変更コミット(本ログ追加)を push し、
  通常の push トリガーで gh-pages への再デプロイ → Pages の再デプロイを誘発する。

## 検証

- [ ] 再デプロイ後の `pages-build-deployment` が success になることを確認
- [ ] ユーザーがスマホで新モデル一覧(Gemma既定・6件)を確認
