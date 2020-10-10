# swap.pet-pETH
1:1 peg to WETH/ETH on swap.pet for ERC20 defi

[TOC]

## rules for PETH 
1. 1:1 peg to WETH/ETH, no cap, only equal to num of WETH/ETH
2. mint PETH by sending WETH/ETH with the ratio of 1:1
3. burn PETH to get ETH with the ratio of 1:1
4. WETH auto translate to ETH 
5. ETH store in Vault pool for produce profit
6. funder/daoExecutor close/open Vault with base and ratio(80-95%) 
7. timelock and ACL for funder/daoExecutor
 
## prepare env
### install LTS Node with nvm
```
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.36.0/install.sh | bash
$ source ~/.bash_profile
$ command -v nvm 
$ nvm -v                
0.36.0
$ nvm ls-remote 
<!-- $ nvm install node # "node" is an alias for the latest version(--lts) -->
$ nvm install --lts
$ node --version
v12.18.4
$ npm -v
6.14.6
$ npx -v
6.14.6
$ nvm reinstall-packages
```

### truffle and ganache-cli
```
$ npm i -g truffle
$ npm i -g ganache-cli
```

### openzeppelin CLI 

wage critic arrow install wrong reopen stem swim unique chapter select mango
==========ETH Address 1 ===========
Pri:1e3f6e0ed23e988194c4d925fe5e30d021af13e4b59bbfc64619bd58c26cc698
Pub:08543fc0bb4d8a84fe682ef0e139356f3a97520133bafcfb452519ec4047461da7232ba1656ba6fbe94b88b02b01867c5fc89b143e7113997f385e477721221e
ETH:0xba0bfac1620fa76ac24b4aa8844f42616bfd2855

curl --user fa6bde7a6a9347848416f62f85ef3500 https://rinkeby.infura.io/v3/30b7709884d246a681aed71a33438f50

curl -X POST \
-H "Content-Type: application/json" \
--data '{"jsonrpc": "2.0", "id": 1, "method": "eth_blockNumber", "params": []}' \
"https://rinkeby.infura.io/v3/30b7709884d246a681aed71a33438f50"

curl https://rinkeby.infura.io/v3/30b7709884d246a681aed71a33438f50 \
-X POST \
-H "Content-Type: application/json" \
-d '{"jsonrpc":"2.0","method":"eth_getBalance","params": ["0xba0bfac1620fa76ac24b4aa8844f42616bfd2855", "latest"],"id":1}'

init pETH project with openzeppelin CLI：
```
$ mkdir pETH
$ cd pETH
$ npm init
$ npm install
$ npm install --save-dev @openzeppelin/cli
$ npx openzeppelin init
OR
$ npx oz init
```

### use openzeppelin CEP for upgradeable
replace `@openzeppelin/contracts` with `@openzeppelin/contracts-ethereum-package` for upgradeable:
`$ npx oz link @openzeppelin/contracts-ethereum-package`
**Note**: Do not use 'selfdestruct' or 'delegatecall' in upgradeable contracts,and Do NOT change the order in which the contract state variables are declared, nor their type. 

## deploy in test
open anothrer terminal:
`$ npx ganache-cli --deterministic`
deploy PETH as ERC20: 
```
$ npx oz deploy
No contracts found to compile.
? Choose the kind of deployment upgradeable
? Pick a network development
? Pick a contract to deploy @openzeppelin/contracts-ethereum-package/ERC20PresetMinterPauserUpgradeSafe
✓ Deploying @openzeppelin/contracts-ethereum-package dependency to network dev-1601800815305
All implementations are up to date
? Call a function to initialize the instance after creating it? Yes
? Select which function initialize(name: string, symbol: string)
? name: string: Swap.Pet pegging ETH/WETH
? symbol: string: pETH
✓ Setting everything up to create contract instances
✓ Instance created at 0x59d3631c86BbE35EF041872d502F218A39FBa150
To upgrade this instance run 'oz upgrade'
0x59d3631c86BbE35EF041872d502F218A39FBa150
```
install OpenZeppelin Upgrades:
`$ npm install @openzeppelin/upgrades`


# advanced-weth

A smart contract that adds functionality to the
[Wrapped Ether](https://github.com/gnosis/canonical-weth) 
smart contract which allows users to interact with other smart
contracts that consume WETH transparently as if they are using ETH directly.

Requires a single approval from the user for the AdvancedWETH contract
to spend any amount of their WETH, and thus benefits from widespread use of a
canonical advanced WETH contract. Because this approval never runs out or expires,
this is a once-per-account requirement to permanently enhance the capabilities of WETH.

The benefit of removing special handling of ETH from your contract is that
you can reduce your interface size significantly, i.e. you can pretend that ETH
already implements the ERC20 interface and consume ETH via the `AdvancedWETH` contract.

## Methods documentation

All methods are documented inline in the 
[contract interface](contracts/interfaces/IAdvancedWETH.sol).

## Deploying a test version

For unit tests, you can depend on the `advanced-weth` npm package 
for access to the contract interface and the build artifacts.

```shell script
npm install --save advanced-weth
```

You can browse the build artifacts included in the npm package
via [unpkg.com/advanced-weth@1.0.0/](https://unpkg.com/browse/advanced-weth@1.0.0/).

Use the bytecode stored in the import path
`advanced-weth/build/contracts/AdvancedWETH.json`
file to deploy the contract for unit tests.

Note only the interface solidity code is shared in the npm package.
This is because to deploy the contract on a testnet, you should use
the build artifact to get an exact copy of the AdvancedWETH contract
regardless of local solc compiler settings.

The constructor has a single argument, the WETH contract address.

## Deploy addresses

The build artifacts in the npm package contain the deployment addresses for programmatic consumption.

The AdvancedWETH contract is deployed and verified to the address `0x27E90122950c9E4E669edcC90Fac6c105770420b` 
on the networks:

- mainnet: https://etherscan.io/address/0x27E90122950c9E4E669edcC90Fac6c105770420b
- ropsten: https://ropsten.etherscan.io/address/0x27E90122950c9E4E669edcC90Fac6c105770420b
- rinkeby: https://rinkeby.etherscan.io/address/0x27E90122950c9E4E669edcC90Fac6c105770420b
- kovan: https://kovan.etherscan.io/address/0x27E90122950c9E4E669edcC90Fac6c105770420b
- goerli: https://goerli.etherscan.io/address/0x27E90122950c9E4E669edcC90Fac6c105770420b

## Disclaimer

This contract has not been audited, nor formally verified. Use at your own risk.
