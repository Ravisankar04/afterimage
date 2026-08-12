# AFTERIMAGE Contracts — Foundry

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)
- Solidity 0.8.24 toolchain (bundled with Foundry)

## Install dependencies

From `packages/contracts`:

```bash
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
forge install foundry-rs/forge-std --no-commit
```

Or:

```bash
make install
# or
npm run install
```

## Build & test

```bash
forge build
forge test -vvv
make test
```

## Layout

- `src/` — registries and EIP-712 helper
- `script/Deploy.s.sol` — deployment script
- `test/` — unit, fuzz, and invariant tests
