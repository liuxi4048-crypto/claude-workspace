# AIDesk — CEO オペレーション管理ツール

ococonara 受注から AI 生成・納品まで **5分で完結** する社内ツール。

## 概要

| 機能 | 説明 |
|------|------|
| 案件登録 | クライアント名・サービス種別・プラン・要件を入力 |
| AI生成 | Claude Sonnet 4.6 で提案書/LP/レポート等を自動生成 |
| 納品管理 | received → generated → delivered のステータス管理 |
| ダッシュボード | 売上・案件数のリアルタイム集計 |

## 起動方法

```powershell
# フロント + バックエンドを同時起動
C:\Claude\aidesk\start.ps1
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:8000/docs

## 本番 URL（フロントエンドのみ）

https://frontend-two-nu-79.vercel.app

> バックエンドはローカル起動が必要。フロントエンドの `VITE_API_URL` 環境変数でバックエンド URL を変更できる。

## 環境変数

### バックエンド (`backend/.env`)
```
ANTHROPIC_API_KEY=sk-ant-...
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19 + TypeScript + Vite + Tailwind CSS |
| バックエンド | FastAPI + Python |
| AI | Claude Sonnet 4.6 (Anthropic API) |
| デプロイ | Vercel（フロント）|
| データ | JSON ファイル（`backend/orders.json`）|

## サービスタイプ

- `proposal` — 提案書・営業資料
- `lp` — LP・セールスコピー
- `report` — レポート・報告書
- `minutes` — 議事録・会議メモ
- `other` — その他ビジネス文書

## プラン

| プラン | 金額 |
|--------|------|
| ベーシック | ¥3,000 |
| スタンダード | ¥8,000 |
| プレミアム | ¥20,000 |
