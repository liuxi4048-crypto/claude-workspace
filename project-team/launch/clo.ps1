$host.UI.RawUI.WindowTitle = "CLO | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor White
Write-Host "│  CLO — 最高法務責任者                    │" -ForegroundColor White
Write-Host "│  役割: 法務・契約・規制対応               │" -ForegroundColor White
Write-Host "│  トリガー: 法務確認 / AI設計（三者合議）  │" -ForegroundColor White
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor White
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\clo.md" -ForegroundColor Gray
Write-Host ""
Set-Location "C:\Claude\team\workspaces\clo"
claude
