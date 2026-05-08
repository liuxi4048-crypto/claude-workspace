# ロードマップ — 優先アクション

_最終更新: 2026-05-08_

---

## 今すぐやるべき（P1）

- [ ] `calendar_app/credentials.json` を `.gitignore` に追加（Git に上がると Google OAuth 認証情報が漏洩する）
- [ ] baito-kanri のデータ永続化方法を確認（ローカルストレージのみ？ → クラウド同期の検討）
- [ ] tangocho の Firebase 設定をコード外の環境変数に移す

## 次のスプリント（P2）

- [ ] calendar_app の自然言語パーサーを baito-kanri のシフト入力に統合
- [ ] file_rewriter に処理履歴ログ機能を追加（何をいつ変換したか）

## 将来の検討事項（P3）

- [ ] baito-kanri をモバイルファーストに再設計
- [ ] tangocho に file_rewriter 連携の単語インポート機能
- [ ] cowork/ プロジェクトごとの進捗トラッキング

## 完了済み

- [x] baito-kanri Vercel デプロイ（2026-04-30 頃）
- [x] tangocho Firebase 統合（2026-04-21 頃）
- [x] url-summarizer スキル作成（2026-04-28 頃）
- [x] pdf-explainer スキル作成（2026-04-24 頃）
- [x] calendar_app 自然言語パーサー実装（2026-04-20 頃）
- [x] CIO エージェント設置（2026-05-08）
