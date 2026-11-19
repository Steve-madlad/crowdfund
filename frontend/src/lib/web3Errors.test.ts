import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatWeb3Error } from './web3Errors.ts';

describe('formatWeb3Error', () => {
  it('turns verbose wallet rejection messages into a short explanation', () => {
    const error = new Error(
      'User rejected the request. Request Arguments: chain: Hardhat (id: 31337) data: 0x1234 Contract Call: cancelCampaign(0) Docs: https://viem.sh Details: MetaMask Tx Signature: User denied transaction signature. Version: viem@2.57.17',
    );

    assert.equal(formatWeb3Error(error), 'You rejected the request in your wallet.');
  });

  it('detects a rejection wrapped in a Viem-style cause chain', () => {
    const error = {
      name: 'ContractFunctionExecutionError',
      shortMessage: 'An error occurred while executing the contract function.',
      cause: {
        name: 'UserRejectedRequestError',
        code: 4001,
        shortMessage: 'User rejected the request.',
      },
    };

    assert.equal(formatWeb3Error(error), 'You rejected the request in your wallet.');
  });

  it('prefers a concise Viem short message over the verbose wrapper message', () => {
    const error = {
      message: 'A very long wrapper message. Request Arguments: data: 0x1234 Docs: https://viem.sh',
      cause: {
        shortMessage: 'The campaign has already been cancelled.',
      },
    };

    assert.equal(formatWeb3Error(error), 'The campaign has already been cancelled.');
  });

  it('uses the decoded contract revert reason when available', () => {
    const error = {
      shortMessage: 'An error occurred while executing the contract function.',
      cause: {
        shortMessage: 'The contract function "cancelCampaign" reverted.',
        reason: 'Campaign has already been cancelled',
      },
    };

    assert.equal(formatWeb3Error(error), 'Campaign has already been cancelled');
  });

  it('trims technical suffixes and bounds unknown error messages', () => {
    assert.equal(
      formatWeb3Error(new Error('RPC connection failed. Version: viem@2.57.17')),
      'RPC connection failed.',
    );
    assert.equal(formatWeb3Error(null), 'An unexpected wallet or network error occurred.');
  });
});
