$host.UI.RawUI.WindowTitle = "CPO | モロミーカンパニー（仮）"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor DarkCyan
Write-Host "│  CPO — 最高プロダクト責任者               │" -ForegroundColor DarkCyan
Write-Host "│  役割: 要件定義・プロダクト設計            │" -ForegroundColor DarkCyan
Write-Host "│  トリガー: 要件定義 / プロダクト設計       │" -ForegroundColor DarkCyan
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\cpo.md" -ForegroundColor DarkCyan
Write-Host ""
Set-Location "C:\Claude\team\workspaces\cpo"
claude
