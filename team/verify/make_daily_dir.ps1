# make_daily_dir.ps1 — 作業開始時に今日の日報ディレクトリを自動作成
# COOの作業開始フローから呼び出す

$today   = Get-Date -Format "yyyy-MM-dd"
$dirPath = "C:\Claude\team\daily_reports\$today"

if (-not (Test-Path $dirPath)) {
    New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
    Write-Host "日報ディレクトリ作成: $dirPath" -ForegroundColor DarkGreen
} else {
    Write-Host "日報ディレクトリ既存: $dirPath" -ForegroundColor DarkGray
}
