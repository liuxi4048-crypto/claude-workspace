# dismiss.ps1 — COOがセッション終了時に全ペインを閉じるスクリプト
# 使用例: pwsh -File dismiss.ps1

Write-Host "セッション終了処理中..." -ForegroundColor DarkCyan

# 現在のウィンドウの全ペインを取得して終了
# （COO自身のペインは最後に閉じる）
$panes = & "C:\Program Files\WezTerm\wezterm.exe" cli list --format json 2>$null | ConvertFrom-Json

if ($panes) {
    $currentPaneId = $env:WEZTERM_PANE
    foreach ($pane in $panes) {
        if ($pane.pane_id -ne $currentPaneId) {
            & "C:\Program Files\WezTerm\wezterm.exe" cli kill-pane --pane-id $pane.pane_id 2>$null
        }
    }
}

Write-Host "全メンバーペインをクローズしました" -ForegroundColor DarkCyan
Write-Host "COOセッションも終了します..." -ForegroundColor DarkGray
