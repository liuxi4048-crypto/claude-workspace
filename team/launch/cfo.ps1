$host.UI.RawUI.WindowTitle = "CFO | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor Yellow
Write-Host "│  CFO — 最高財務責任者                    │" -ForegroundColor Yellow
Write-Host "│  役割: 財務・見積・KPI管理                │" -ForegroundColor Yellow
Write-Host "│  トリガー: 見積作成 / 予算確認 / KPI確認  │" -ForegroundColor Yellow
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor Yellow
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\cfo.md" -ForegroundColor DarkYellow
Write-Host ""
Set-Location "C:\Claude\team\workspaces\cfo"
claude
