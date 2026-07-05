# 作業ログ: Pocket LLM(スマホ用ローカルLLM PWA)実装

- **日時**: 2026-07-05 11:13
- **ブランチ**: claude/local-llm-mobile-app-55t9c8
- **成果物**: `application/pocket-llm/`

## 依頼内容

スマホ上にローカルLLMを導入し、計算や要約などの基本的なAIタスクを行えるアプリ/システムを作成する。
(追加要望: できるだけ高性能なLLMを採用すること、ローカルLLMの得意/不得意を明言化すること)

## 実施内容

1. **方式決定**(ユーザー確認済み): Android / PWA(ブラウザ版)/ 品質優先モデル
   - クラウドセッションからスマホへ直接インストール不可のため、URLを開くだけで動く WebLLM ベースの PWA を採用
2. **アプリ実装**: Vite + vanilla JS + @mlc-ai/web-llm 0.2.84
   - 3モード: チャット(履歴保存)/ 要約(短・段落・箇条書き、6,000字上限)/ 計算
   - 計算モードは自作の再帰下降数式パーサー(eval不使用)で正確に計算、文章題のみLLM
   - WebGPU 判定と非対応時の案内、モデルDL進捗バー、Service Worker + manifest で PWA 化
   - Qwen3 系 `<think>` タグのストリーミング除去処理
3. **モデル採用**: web-llm prebuilt に **Qwen3.5 系**(計画時想定の Qwen3 より新世代)があることを確認し優先採用
   - 既定: Qwen3.5-4B-q4f16_1(高品質)、選択肢: 9B / 2B / gemma-2-2b-jpn / 0.8B
4. **デプロイ**: `.github/workflows/deploy-pocket-llm.yml`(master push で GitHub Pages へ)
   - ⚠️ 初回のみ Settings → Pages → Source を「GitHub Actions」に設定する必要あり

## 検証結果

- ユニットテスト(数式パーサー): **8/8 pass**(四則演算・優先順位・関数・全角正規化・エラー処理)
- `npm run build`: 成功
- Chromium UIスモークテスト(scripts/ui-check.mjs): **12/12 pass**
  (タブ切替・計算モードの電卓応答・WebGPU非対応時の警告表示・manifest 取得・JSエラーなし)
- 推論の実機確認は未実施(コンテナにGPUなし)→ ユーザーのスマホ実機での確認待ち

## 残タスク / バトンタッチ

- [ ] master へのマージ後、GitHub Pages の Source を「GitHub Actions」に設定(ユーザー操作)
- [ ] スマホ実機で URL を開き、モデルDL → チャット/要約/計算の動作確認
- [ ] 動作が重い場合はモデルを 2B / 0.8B に切替して検証
