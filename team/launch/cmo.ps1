$host.UI.RawUI.WindowTitle = "CMO | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "│  CMO — 最高マーケティング責任者           │" -ForegroundColor Green
Write-Host "│  役割: 営業・提案・顧客フォロー            │" -ForegroundColor Green
Write-Host "│  トリガー: 営業開始 / 提案作成            │" -ForegroundColor Green
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor Green
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\cmo.md" -ForegroundColor DarkGreen
Write-Host ""
Set-Location "C:\Claude\team\workspaces\cmo"
claude
