const WETH = artifacts.require('WETH9');
const AdvancedWETH = artifacts.require('AdvancedWETH');
const TargetContract = artifacts.require('TargetContract');
const BN = require('bn.js');

const MaxUint256 = (new BN(2)).pow(new BN(256)).sub(new BN(1)).toString()

contract('AdvancedWETH', ([account0, account1, account2]) => {
  let weth;
  let advancedWeth;
  let targetContract;

  let balancesBefore;

  async function getBalance(address) {
    return new BN((await web3.eth.getBalance(address)).toString());
  }

  async function recordBalanceBefore(address) {
    balancesBefore[ address ] = await getBalance(address);
  }

  async function checkBalanceDifference(address, diff) {
    const after = await getBalance(address);
    expect(after.sub(balancesBefore[ address ]).toString()).to.eq(diff.toString());
  }

  function sendETH(to, amount, from) {
    return web3.eth.sendTransaction({ to, value: amount, from });
  }

  function encodeTargetCallData(wethAddress, amount) {
    return web3.eth.abi.encodeFunctionCall({
      'inputs': [
        {
          'internalType': 'address payable',
          'name': 'weth',
          'type': 'address'
        },
        {
          'internalType': 'uint256',
          'name': 'amount',
          'type': 'uint256'
        }
      ],
      'name': 'targetCall',
      'type': 'function'
    }, [wethAddress, amount]);
  }

  async function expectError(fn, msg) {
    let threw = false;
    try {
      await (typeof fn === 'function' ? fn() : fn);
    } catch (error) {
      threw = true;
      expect(error.message).to.contain(msg);
    }
    expect(threw).to.eq(true);
  }

  beforeEach('reset balancesBefore', () => {
    balancesBefore = {};
  });

  beforeEach('deploy WETH', async () => {
    weth = await WETH.new();
  });

  beforeEach('deploy AdvancedWETH', async () => {
    advancedWeth = await AdvancedWETH.new(weth.address);
  });

  beforeEach('deploy TargetContract', async () => {
    targetContract = await TargetContract.new();
  });

  it('is deployed', () => {
    expect(weth.address).to.be.a('string');
    expect(advancedWeth.address).to.be.a('string');
  });

  it('points at weth', async () => {
    expect(await advancedWeth.weth()).to.eq(weth.address);
  });

  describe('#depositAndTransferFromThenCall', () => {
    beforeEach('make some weth', async () => {
      await weth.deposit({ value: 100, from: account0 });
    });

    afterEach('advancedWeth has no balance', async () => {
      expect((await weth.balanceOf(advancedWeth.address)).toNumber()).to.eq(0);
      expect((await getBalance(advancedWeth.address)).toNumber()).to.eq(0);
    });

    it('reverts on overflow', async () => {
      await weth.testSetBalance(account0, MaxUint256);
      await weth.approve(advancedWeth.address, MaxUint256, { from: account0 });

      await expectError(advancedWeth.depositAndTransferFromThenCall(MaxUint256, targetContract.address, encodeTargetCallData(weth.address, 30), {
        value: 1,
        gasPrice: 0
      }), 'OVERFLOW');
    });

    it('reverts on zero inputs', async () => {
      await weth.approve(advancedWeth.address, 20, { from: account0 });
      await expectError(advancedWeth.depositAndTransferFromThenCall(0, targetContract.address, encodeTargetCallData(weth.address, 30), {
        value: 0,
        gasPrice: 0
      }), 'ZERO_INPUTS');
    });

    it('can combine weth and eth to call target', async () => {
      await weth.approve(advancedWeth.address, 20, { from: account0 });
      await targetContract.update(0, 100); // allow receiving up to 100 weth

      expect((await weth.balanceOf(account0)).toNumber()).to.eq(100); // weth not spent
      expect((await weth.balanceOf(targetContract.address)).toNumber()).to.eq(0); // target contract empty

      await recordBalanceBefore(account0);
      await advancedWeth.depositAndTransferFromThenCall(20, targetContract.address, encodeTargetCallData(weth.address, 30), {
        value: 20,
        gasPrice: 0
      });

      // 1. wraps 20 wei, combined with 20 weith, approves 40, spends 30, gets back 10, so -10 wei and -20 weth
      await checkBalanceDifference(account0, -10);
      expect((await weth.balanceOf(account0)).toNumber()).to.eq(80);
      // full 30 weth was taken
      expect((await weth.balanceOf(targetContract.address)).toNumber()).to.eq(30);
    });

    it('reverts on missing approval', async () => {
      await targetContract.update(0, 100); // allow receiving up to 100 weth

      await recordBalanceBefore(account0);
      await expectError(advancedWeth.depositAndTransferFromThenCall(20, targetContract.address, encodeTargetCallData(weth.address, 30), {
        value: 20,
        gasPrice: 0
      }), 'revert');
    });

    it('reverts on target contract failed receive', async () => {
      await weth.approve(advancedWeth.address, 20, { from: account0 });
      await targetContract.update(0, 0); // allow receiving up to 100 weth

      await expectError(advancedWeth.depositAndTransferFromThenCall(20, targetContract.address, encodeTargetCallData(weth.address, 30), {
        value: 20,
        gasPrice: 0
      }), 'TO_CALL_FAILED');
    });
  });

  describe('#receive', () => {
    it('reject if not from weth', async () => {
      await expectError(sendETH(advancedWeth.address, 1, account0), 'WETH_ONLY');
    });
  });

  describe('#withdrawTo', () => {
    beforeEach('make some weth', async () => {
      await weth.deposit({ value: 100, from: account0 });
    });

    it('no-op if empty', async () => {
      await advancedWeth.withdrawTo(account1, { from: account0 });
      expect((await weth.balanceOf(account0)).toNumber()).to.eq(100);
      expect((await weth.balanceOf(account1)).toNumber()).to.eq(0);
    });

    it('forwards balance as eth', async () => {
      await weth.transfer(advancedWeth.address, 25, { from: account0 });
      expect((await weth.balanceOf(account0)).toNumber()).to.eq(75);
      expect((await weth.balanceOf(advancedWeth.address)).toNumber()).to.eq(25);

      await recordBalanceBefore(account2);
      await advancedWeth.withdrawTo(account2, { from: account1 }); // diff account than depositor
      expect((await weth.balanceOf(advancedWeth.address)).toNumber()).to.eq(0);
      expect((await weth.balanceOf(account2)).toNumber()).to.eq(0); // no weth on the target account
      await checkBalanceDifference(account2, 25);
    });

    // ends up depositing right back into advanced weth
    it('withdrawTo WETH is no-op', async () => {
      await weth.transfer(advancedWeth.address, 25, { from: account0 });
      await advancedWeth.withdrawTo(weth.address, { from: account0 });
      expect((await weth.balanceOf(advancedWeth.address)).toNumber()).to.eq(25);
    });

    it('fails if to address does not receive eth', async () => {
      await weth.transfer(advancedWeth.address, 25, { from: account0 });
      await expectError(advancedWeth.withdrawTo(targetContract.address, { from: account0 }), 'WITHDRAW_TO_CALL_FAILED');
    });

    it('succeeds for contract call that receives eth', async () => {
      await weth.transfer(advancedWeth.address, 25, { from: account0 });
      await targetContract.update(25, 0);
      await recordBalanceBefore(targetContract.address);
      await advancedWeth.withdrawTo(targetContract.address, { from: account0 });
      await checkBalanceDifference(targetContract.address, 25);
    });
  });
});