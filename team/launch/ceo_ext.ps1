$host.UI.RawUI.WindowTitle = "CEO-Ext | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "│  CEO-Ext — 外向きCEO                     │" -ForegroundColor Green
Write-Host "│  判断軸: 「勝てるか・売れるか」           │" -ForegroundColor Green
Write-Host "│  優先: 収益・スピード・市場競争力         │" -ForegroundColor Green
Write-Host "│  トリガー: CEO判断 / 提案審議             │" -ForegroundColor Green
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor Green
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\ceo_ext.md" -ForegroundColor DarkGreen
Write-Host "相手ペイン:   CEO-Int（右）の発言を確認してから反論する" -ForegroundColor DarkGreen
Write-Host ""
Set-Location "C:\Claude\team\workspaces\ceo_ext"
claude
