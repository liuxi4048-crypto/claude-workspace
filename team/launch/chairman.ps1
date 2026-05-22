$host.UI.RawUI.WindowTitle = "Chairman | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor Magenta
Write-Host "│  Chairman — 取締役会議長                 │" -ForegroundColor Magenta
Write-Host "│  役割: 最終審査・裁定・差し戻し権         │" -ForegroundColor Magenta
Write-Host "│  トリガー: フェーズ完了 / CEO判断（裁定） │" -ForegroundColor Magenta
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor Magenta
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\chairman.md" -ForegroundColor DarkMagenta
Write-Host "裁定後: decision_log.md に必ず記録すること" -ForegroundColor DarkMagenta
Write-Host ""
Set-Location "C:\Claude\team\workspaces\chairman"
claude
