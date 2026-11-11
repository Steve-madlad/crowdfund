import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CrowdFunding
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const crowdFundingAbi = [
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'campaigns',
    outputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'title', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'target', internalType: 'uint256', type: 'uint256' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'amountCollected', internalType: 'uint256', type: 'uint256' },
      { name: 'image', internalType: 'string', type: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_owner', internalType: 'address', type: 'address' },
      { name: '_title', internalType: 'string', type: 'string' },
      { name: '_description', internalType: 'string', type: 'string' },
      { name: '_target', internalType: 'uint256', type: 'uint256' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
      { name: '_image', internalType: 'string', type: 'string' },
    ],
    name: 'createCampaign',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_id', internalType: 'uint256', type: 'uint256' }],
    name: 'donateToCampaign',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCampaigns',
    outputs: [
      {
        name: '',
        internalType: 'struct CrowdFunding.Campaign[]',
        type: 'tuple[]',
        components: [
          { name: 'owner', internalType: 'address', type: 'address' },
          { name: 'title', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'target', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint256', type: 'uint256' },
          { name: 'amountCollected', internalType: 'uint256', type: 'uint256' },
          { name: 'image', internalType: 'string', type: 'string' },
          { name: 'donators', internalType: 'address[]', type: 'address[]' },
          { name: 'donations', internalType: 'uint256[]', type: 'uint256[]' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_id', internalType: 'uint256', type: 'uint256' }],
    name: 'getDonators',
    outputs: [
      { name: '', internalType: 'address[]', type: 'address[]' },
      { name: '', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'numberOfCampaigns',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__
 */
export const useReadCrowdFunding = /*#__PURE__*/ createUseReadContract({
  abi: crowdFundingAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"campaigns"`
 */
export const useReadCrowdFundingCampaigns = /*#__PURE__*/ createUseReadContract(
  { abi: crowdFundingAbi, functionName: 'campaigns' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"getCampaigns"`
 */
export const useReadCrowdFundingGetCampaigns =
  /*#__PURE__*/ createUseReadContract({
    abi: crowdFundingAbi,
    functionName: 'getCampaigns',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"getDonators"`
 */
export const useReadCrowdFundingGetDonators =
  /*#__PURE__*/ createUseReadContract({
    abi: crowdFundingAbi,
    functionName: 'getDonators',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"numberOfCampaigns"`
 */
export const useReadCrowdFundingNumberOfCampaigns =
  /*#__PURE__*/ createUseReadContract({
    abi: crowdFundingAbi,
    functionName: 'numberOfCampaigns',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link crowdFundingAbi}__
 */
export const useWriteCrowdFunding = /*#__PURE__*/ createUseWriteContract({
  abi: crowdFundingAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"createCampaign"`
 */
export const useWriteCrowdFundingCreateCampaign =
  /*#__PURE__*/ createUseWriteContract({
    abi: crowdFundingAbi,
    functionName: 'createCampaign',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"donateToCampaign"`
 */
export const useWriteCrowdFundingDonateToCampaign =
  /*#__PURE__*/ createUseWriteContract({
    abi: crowdFundingAbi,
    functionName: 'donateToCampaign',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link crowdFundingAbi}__
 */
export const useSimulateCrowdFunding = /*#__PURE__*/ createUseSimulateContract({
  abi: crowdFundingAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"createCampaign"`
 */
export const useSimulateCrowdFundingCreateCampaign =
  /*#__PURE__*/ createUseSimulateContract({
    abi: crowdFundingAbi,
    functionName: 'createCampaign',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"donateToCampaign"`
 */
export const useSimulateCrowdFundingDonateToCampaign =
  /*#__PURE__*/ createUseSimulateContract({
    abi: crowdFundingAbi,
    functionName: 'donateToCampaign',
  })
