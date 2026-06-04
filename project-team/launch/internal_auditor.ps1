$host.UI.RawUI.WindowTitle = "Internal Auditor | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor DarkYellow
Write-Host "│  Internal Auditor — 内部監査役            │" -ForegroundColor DarkYellow
Write-Host "│  役割: 全プロセス・財務監査               │" -ForegroundColor DarkYellow
Write-Host "│  トリガー: 内部監査 / フェーズ完了        │" -ForegroundColor DarkYellow
Write-Host "│  指摘は punch_list.md に必ず記録          │" -ForegroundColor DarkYellow
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\internal_auditor.md" -ForegroundColor DarkGray
Write-Host ""
Set-Location "C:\Claude\team\workspaces\internal_auditor"
claude
