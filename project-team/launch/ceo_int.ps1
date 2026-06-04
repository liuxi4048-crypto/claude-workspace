$host.UI.RawUI.WindowTitle = "CEO-Int | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor Yellow
Write-Host "│  CEO-Int — 内向きCEO                     │" -ForegroundColor Yellow
Write-Host "│  判断軸: 「作れるか・持続できるか」       │" -ForegroundColor Yellow
Write-Host "│  優先: 品質・実現性・技術的負債           │" -ForegroundColor Yellow
Write-Host "│  トリガー: CEO判断 / 提案審議             │" -ForegroundColor Yellow
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor Yellow
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\ceo_int.md" -ForegroundColor DarkYellow
Write-Host "相手ペイン:   CEO-Ext（左）の発言に対して反論・対案を提示する" -ForegroundColor DarkYellow
Write-Host ""
Set-Location "C:\Claude\team\workspaces\ceo_int"
claude
