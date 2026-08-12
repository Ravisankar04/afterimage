# Install Foundry libs for AFTERIMAGE contracts (Windows PowerShell).
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$env:PATH = "$env:USERPROFILE\.foundry\bin;" + $env:PATH
$env:FOUNDRY_DISABLE_NIGHTLY_WARNING = "1"

if (-not (Test-Path .git)) {
  git init
}

forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
forge install foundry-rs/forge-std --no-commit
forge build
Write-Host "Installed OpenZeppelin v5.0.2 + forge-std. Run: forge test -vvv"
