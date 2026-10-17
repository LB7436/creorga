param(
  [Parameter(Mandatory=$true)][string]$LauncherPath,
  [string]$DestinationDirectory = [Environment]::GetFolderPath('DesktopDirectory'),
  [switch]$Stop
)
$ErrorActionPreference = 'Stop'
$taskLauncher = (Resolve-Path -LiteralPath $LauncherPath).Path
if ([IO.Path]::GetExtension($taskLauncher) -ne '.ps1') { throw 'A PowerShell launcher is required.' }
$taskDestination = (Resolve-Path -LiteralPath $DestinationDirectory).Path
if (!(Test-Path -LiteralPath $taskDestination -PathType Container)) { throw 'Destination directory is required.' }
# ASCII source also works in Windows PowerShell 5.1 without changing encoding policy.
$taskName = 'Cr' + [char]0x00e9 + 'Orga 2.0'
if ($Stop) { $taskName = 'Arr' + [char]0x00ea + 'ter ' + $taskName }
$taskShortcutPath = Join-Path $taskDestination ($taskName + '.lnk')
$taskPowerShell = Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$taskArguments = '-NoProfile -File "' + $taskLauncher + '"'
if ($Stop) { $taskArguments = '-NoProfile -WindowStyle Hidden -File "' + $taskLauncher + '" -Stop' }
$taskShell = New-Object -ComObject WScript.Shell
$taskLink = $taskShell.CreateShortcut($taskShortcutPath)
if ((Test-Path -LiteralPath $taskShortcutPath) -and
  ($taskLink.TargetPath -ne $taskPowerShell -or $taskLink.Arguments -ne $taskArguments)) {
  throw 'An unrelated shortcut already exists. It was preserved.'
}
$taskLink.TargetPath = $taskPowerShell
$taskLink.Arguments = $taskArguments
$taskLink.WorkingDirectory = Split-Path -Parent $taskLauncher
$taskLink.WindowStyle = 7
$taskLink.Description = if ($Stop) { 'CreOrga 2.0 - confirmed graceful shutdown, database preserved' } else { 'CreOrga 2.0 - business profile, no games, dedicated browser' }
$taskLink.Save()
$taskCheck = $taskShell.CreateShortcut($taskShortcutPath)
if ($taskCheck.TargetPath -ne $taskPowerShell -or $taskCheck.Arguments -ne $taskArguments) { throw 'Shortcut verification failed.' }
[pscustomobject]@{ shortcut = $taskShortcutPath; verified = $true; startupTaskCreated = $false } | ConvertTo-Json -Compress
