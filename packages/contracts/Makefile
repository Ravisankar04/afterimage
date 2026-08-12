.PHONY: install build test test-fuzz test-gas clean fmt coverage deploy-local

install:
	forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
	forge install foundry-rs/forge-std --no-commit

build:
	forge build

test:
	forge test -vvv

test-fuzz:
	forge test --fuzz-runs 1000 -vv

test-gas:
	forge test --gas-report

clean:
	forge clean

fmt:
	forge fmt

coverage:
	forge coverage

deploy-local:
	forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
