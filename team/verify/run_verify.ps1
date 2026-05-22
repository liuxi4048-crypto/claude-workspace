# run_verify.ps1 — チームシステム自動検証スクリプト
# 実行: pwsh -File C:\Claude\team\verify\run_verify.ps1
# 出力: verify_report.md を自動生成

param(
    [switch]$Quick,   # 静的チェックのみ
    [switch]$Report   # レポート保存（デフォルトON）
)

$teamDir    = "C:\Claude\team"
$launchDir  = "$teamDir\launch"
$wsDir      = "$teamDir\workspaces"
$reportPath = "$teamDir\verify\verify_report.md"
$wezterm    = "C:\Program Files\WezTerm\wezterm.exe"

$pass = 0; $warn = 0; $fail = 0
$lines = @()

function Log-Pass($msg) { $script:pass++; $script:lines += "✅ $msg"; Write-Host "✅ $msg" -ForegroundColor Green }
function Log-Warn($msg) { $script:warn++; $script:lines += "⚠️  $msg"; Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Log-Fail($msg) { $script:fail++; $script:lines += "❌ $msg"; Write-Host "❌ $msg" -ForegroundColor Red }
function Log-Head($msg) { $script:lines += "`n### $msg"; Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor DarkCyan
Write-Host "║  チームシステム自動検証 — COO主導         ║" -ForegroundColor DarkCyan
Write-Host "║  $(Get-Date -Format 'yyyy-MM-dd HH:mm')                       ║" -ForegroundColor DarkCyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor DarkCyan

$lines += "# チームシステム検証レポート"
$lines += "**実行日時**: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$lines += ""

# ─────────────────────────────────────────────
# [1] インフラ確認
# ─────────────────────────────────────────────
Log-Head "1. インフラ確認"

if (Test-Path $wezterm) { Log-Pass "WezTerm インストール済み" }
else                     { Log-Fail "WezTerm が見つかりません: $wezterm" }

$claudeCmd = Get-Command "claude" -ErrorAction SilentlyContinue
if ($claudeCmd) { Log-Pass "claude CLI が PATH に存在" }
else            { Log-Fail "claude コマンドが見つかりません" }

# ─────────────────────────────────────────────
# [2] ペルソナファイル存在チェック
# ─────────────────────────────────────────────
Log-Head "2. ペルソナファイル確認"

$members = @("chairman","ceo_ext","ceo_int","coo","cto","cpo","cfo","cmo","chro","ciso","caio","clo","cxo","internal_auditor","internal_tech_auditor","external_auditor")
foreach ($m in $members) {
    $path = "$teamDir\$m.md"
    if (Test-Path $path) { Log-Pass "ペルソナ存在: $m.md" }
    else                 { Log-Fail "ペルソナ不足: $m.md" }
}

# ─────────────────────────────────────────────
# [3] ランチスクリプト整合性
# ─────────────────────────────────────────────
Log-Head "3. ランチスクリプト整合性"

$memberScripts = $members | ForEach-Object { "$_.ps1" }
foreach ($s in $memberScripts) {
    $path = "$launchDir\$s"
    if (-not (Test-Path $path)) { Log-Fail "スクリプト不足: $s"; continue }
    $content = Get-Content $path -Raw
    $member  = [System.IO.Path]::GetFileNameWithoutExtension($s)
    $hasSetLoc = $content -match 'Set-Location'
    $hasClaude = $content -match '\bclaude\b'
    $hasWsDir  = $content -match "workspaces\\$member"
    if ($hasSetLoc -and $hasClaude -and $hasWsDir) { Log-Pass "$s — Set-Location / claude / workspace 全OK" }
    elseif (-not $hasSetLoc) { Log-Fail "$s — Set-Location が不足" }
    elseif (-not $hasClaude) { Log-Fail "$s — claude 起動命令が不足" }
    elseif (-not $hasWsDir)  { Log-Warn "$s — workspace パスが不一致（要確認）" }
}

# summon.ps1
if (Test-Path "$launchDir\summon.ps1") { Log-Pass "summon.ps1 存在" } else { Log-Fail "summon.ps1 不足" }
if (Test-Path "$launchDir\dismiss.ps1") { Log-Pass "dismiss.ps1 存在" } else { Log-Fail "dismiss.ps1 不足" }

# ─────────────────────────────────────────────
# [4] ワークスペース整合性
# ─────────────────────────────────────────────
Log-Head "4. ワークスペース整合性"

foreach ($m in $members) {
    $wsPath    = "$wsDir\$m"
    $claudeMd  = "$wsPath\CLAUDE.md"
    if (-not (Test-Path $wsPath)) { Log-Fail "ワークスペース不足: workspaces\$m\"; continue }
    if (-not (Test-Path $claudeMd)) { Log-Fail "CLAUDE.md 不足: workspaces\$m\CLAUDE.md"; continue }
    $content = Get-Content $claudeMd -Raw
    $expectedRef = "@../../$m.md"
    if ($content.Trim() -eq $expectedRef) { Log-Pass "CLAUDE.md 参照正常: $m" }
    else { Log-Warn "CLAUDE.md 参照が予期せぬ形式: $m`n  期待: $expectedRef`n  実際: $($content.Trim())" }
}

# ─────────────────────────────────────────────
# [5] シナリオスクリプト確認
# ─────────────────────────────────────────────
Log-Head "5. シナリオ並行実行スクリプト確認"

$scenarios = @{
    "scenario_ceo_debate.ps1"     = @("ceo_ext.ps1","ceo_int.ps1")
    "scenario_proposal.ps1"       = @("cmo.ps1","cfo.ps1")
    "scenario_sprint_end.ps1"     = @("internal_auditor.ps1","internal_tech_auditor.ps1")
    "scenario_ai_governance.ps1"  = @("caio.ps1","clo.ps1","ciso.ps1")
}

foreach ($sc in $scenarios.Keys) {
    $path = "$launchDir\$sc"
    if (-not (Test-Path $path)) { Log-Fail "シナリオ不足: $sc"; continue }
    $content = Get-Content $path -Raw
    $hasSplit = $content -match 'split-pane'
    $hasSpawn = $content -match 'spawn'
    $memberOk = $true
    foreach ($dep in $scenarios[$sc]) {
        $memberName = [System.IO.Path]::GetFileNameWithoutExtension($dep)
        if ($content -notmatch $memberName) { $memberOk = $false; Log-Warn "$sc — $dep への参照が見つからない" }
    }
    if ($hasSplit -and $hasSpawn) {
        if ($memberOk) { Log-Pass "$sc — 並行起動設定OK（spawn+split-pane）" }
    } else {
        if (-not $hasSplit) { Log-Warn "$sc — split-pane が未使用（並行性に注意）" }
        if (-not $hasSpawn) { Log-Warn "$sc — spawn が未使用" }
    }
}

# ─────────────────────────────────────────────
# [6] 日報ディレクトリ確認
# ─────────────────────────────────────────────
Log-Head "6. 日報・ログディレクトリ確認"

$dirs = @("$teamDir\daily_reports", "$teamDir\verify")
foreach ($d in $dirs) {
    if (Test-Path $d) { Log-Pass "ディレクトリ存在: $([System.IO.Path]::GetFileName($d))\" }
    else {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        Log-Warn "ディレクトリを新規作成: $([System.IO.Path]::GetFileName($d))\"
    }
}

$managedFiles = @("decision_log.md","punch_list.md","retro_log.md","project_master_plan.md","parallel_runner.md")
foreach ($f in $managedFiles) {
    if (Test-Path "$teamDir\$f") { Log-Pass "管理ファイル存在: $f" }
    else { Log-Fail "管理ファイル不足: $f" }
}

# ─────────────────────────────────────────────
# [7] COO自律性チェック（coo.md の必須セクション）
# ─────────────────────────────────────────────
Log-Head "7. COOペルソナ自律性定義チェック"

$cooMd = Get-Content "$teamDir\coo.md" -Raw
$requiredSections = @{
    "召喚判断ロジック"  = "自動召喚ルール|召喚判断"
    "並列実行条件"      = "並列実行"
    "セッション開始行動" = "作業開始"
    "セッション終了行動" = "作業終了"
    "エスカレーション"  = "エスカレーション|呼び出しルール|P0|P1"
}
foreach ($sec in $requiredSections.Keys) {
    if ($cooMd -match $requiredSections[$sec]) { Log-Pass "COO定義済み: $sec" }
    else { Log-Fail "COO定義不足: $sec" }
}

# ─────────────────────────────────────────────
# [8] parallel_runner.md のAgent toolテンプレート確認
# ─────────────────────────────────────────────
Log-Head "8. 並列実行ガイド（parallel_runner.md）確認"

$prMd = Get-Content "$teamDir\parallel_runner.md" -Raw
$prChecks = @{
    "Agent起動手順"    = "Agent tool"
    "並列判断チェックリスト" = "独立して動けるか|独立"
    "結果統合手順"     = "統合"
    "メンバーペルソナパス" = "ペルソナファイルパス|ペルソナ"
}
foreach ($k in $prChecks.Keys) {
    if ($prMd -match $prChecks[$k]) { Log-Pass "parallel_runner定義済み: $k" }
    else { Log-Warn "parallel_runner要確認: $k" }
}

# ─────────────────────────────────────────────
# サマリー
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host "  検証完了: ✅ $pass 件PASS  ⚠️  $warn 件WARN  ❌ $fail 件FAIL" -ForegroundColor $(if ($fail -gt 0) {"Red"} elseif ($warn -gt 0) {"Yellow"} else {"Green"})
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan

$lines += ""
$lines += "---"
$lines += "## サマリー"
$lines += "| 結果 | 件数 |"
$lines += "|---|---|"
$lines += "| ✅ PASS | $pass |"
$lines += "| ⚠️  WARN | $warn |"
$lines += "| ❌ FAIL | $fail |"
$lines += ""
$lines += "_自動生成: run_verify.ps1 / $(Get-Date -Format 'yyyy-MM-dd HH:mm')_"

# レポート保存
$lines | Out-File -FilePath $reportPath -Encoding UTF8 -Force
Write-Host ""
Write-Host "レポート保存: $reportPath" -ForegroundColor DarkGray

if ($fail -gt 0) { exit 1 } else { exit 0 }
