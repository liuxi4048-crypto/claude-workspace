$host.UI.RawUI.WindowTitle = "CISO | モロミーカンパニー（仮）チーム"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor Red
Write-Host "│  CISO — 最高情報セキュリティ責任者        │" -ForegroundColor Red
Write-Host "│  役割: セキュリティ・サイバー対策         │" -ForegroundColor Red
Write-Host "│  トリガー: セキュリティ確認 / AI設計      │" -ForegroundColor Red
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor Red
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\ciso.md" -ForegroundColor DarkRed
Write-Host ""
Set-Location "C:\Claude\team\workspaces\ciso"
claude
