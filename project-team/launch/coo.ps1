$host.UI.RawUI.WindowTitle = "COO | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│  COO — 最高執行責任者  ✅ 常駐           │" -ForegroundColor Cyan
Write-Host "│  役割: タスク管理・召喚判断・日報統合      │" -ForegroundColor Cyan
Write-Host "│  トリガー: 作業開始 / 作業終了 / タスク確認│" -ForegroundColor Cyan
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\coo.md" -ForegroundColor DarkCyan
Write-Host ""
Set-Location "C:\Claude\team\workspaces\coo"
claude
