# ブランチ戦略

---

## ブランチ構成

```
main（本番環境）
  └── develop（開発統合）
        ├── feature/[issue-id]-[description]
        ├── fix/[issue-id]-[description]
        └── chore/[description]
```

---

## ブランチルール

| ブランチ | 目的 | 直接 push | マージ条件 |
|---------|------|-----------|-----------|
| `main` | 本番リリース | **禁止** | ユーザー承認必須 |
| `develop` | 開発統合 | **禁止** | 玉城先生承認 + りつい |
| `feature/*` | 機能開発 | りゅうき が担当 | レビュー完了後 |
| `fix/*` | バグ修正 | りゅうき が担当 | レビュー完了後 |
| `chore/*` | 設定・ドキュメント | りつい / りゅうき | 内部確認のみ |

---

## ブランチ命名規則

```
feature/[Linear-ID]-[kebab-case-description]
fix/[Linear-ID]-[kebab-case-description]
chore/[kebab-case-description]

例:
  feature/MOR-42-user-authentication
  fix/MOR-55-login-redirect-bug
  chore/setup-eslint-config
```

---

## ブランチ操作（りつい が実行）

### 新規ブランチ作成
```bash
git checkout develop
git pull origin develop
git checkout -b feature/MOR-XX-description
```

### develop へのマージ（レビュー完了後）
```bash
git checkout develop
git merge --no-ff feature/MOR-XX-description -m "[りつい] feat: MOR-XX description を develop へマージ"
git push origin develop
git branch -d feature/MOR-XX-description
```

### main へのマージ（ユーザー承認必須）
```
この操作はユーザーに確認を求めてから実行する。
ユーザーの明示的な承認なしに main への push は絶対に行わない。
```

---

## 保護ルール

- `main` および `develop` への直接 push は禁止
- すべての変更は Pull Request 経由（ローカルブランチ → develop）
- レビューなしのマージは禁止
