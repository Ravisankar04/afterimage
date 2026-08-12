#!/usr/bin/env bash
# Install Foundry libs for AFTERIMAGE contracts.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  git init
fi

forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
forge install foundry-rs/forge-std --no-commit
forge build
echo "Installed OpenZeppelin v5.0.2 + forge-std. Run: forge test -vvv"
