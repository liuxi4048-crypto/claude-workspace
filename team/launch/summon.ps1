# summon.ps1 — COOがメンバーを召喚するためのヘルパースクリプト
# 呼び出し元: COO（Claude Code）
# 使用例: pwsh -File summon.ps1 -Member cto
#         pwsh -File summon.ps1 -Member cto -Split Right -Percent 50

param(
    [Parameter(Mandatory)][string]$Member,
    [ValidateSet("Tab","Right","Left","Bottom","Top")]
    [string]$Layout = "Tab",
    [int]$Percent = 50
)

$launchDir = "C:\Claude\team\launch"
$script    = "$launchDir\$Member.ps1"

if (-not (Test-Path $script)) {
    Write-Error "メンバースクリプトが見つかりません: $script"
    exit 1
}

$weztermArgs = @("cli")

if ($Layout -eq "Tab") {
    $weztermArgs += @("spawn", "--cwd", "C:\Claude", "--", "pwsh", "-NoLogo", "-File", $script)
} else {
    $dir = $Layout.ToLower()
    $weztermArgs += @("split-pane", "--$dir", "--percent", $Percent, "--cwd", "C:\Claude",
                      "--", "pwsh", "-NoLogo", "-File", $script)
}

& "C:\Program Files\WezTerm\wezterm.exe" @weztermArgs
