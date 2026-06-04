$host.UI.RawUI.WindowTitle = "Internal Tech Auditor | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor DarkYellow
Write-Host "│  Internal Tech Auditor — 技術内部監査委員 │" -ForegroundColor DarkYellow
Write-Host "│  役割: 技術プロセス監査（スプリント末のみ）│" -ForegroundColor DarkYellow
Write-Host "│  トリガー: 技術監査                       │" -ForegroundColor DarkYellow
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\internal_tech_auditor.md" -ForegroundColor DarkGray
Write-Host ""
Set-Location "C:\Claude\team\workspaces\internal_tech_auditor"
claude
