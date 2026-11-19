import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CrowdFunding
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const crowdFundingAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'CampaignCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'target',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'deadline',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CampaignCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'donor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'totalCollected',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DonationReceived',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'FundsWithdrawn',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'donor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RefundClaimed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RefundsProcessed',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_CAMPAIGN_IMAGES',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_IMAGE_URL_BYTES',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REFUND_DELAY',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
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
      { name: 'cancelled', internalType: 'bool', type: 'bool' },
      { name: 'withdrawn', internalType: 'bool', type: 'bool' },
      { name: 'refundsEnabled', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_id', internalType: 'uint256', type: 'uint256' }],
    name: 'cancelCampaign',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_id', internalType: 'uint256', type: 'uint256' }],
    name: 'claimRefund',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'contributions',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
      { name: '_images', internalType: 'string[]', type: 'string[]' },
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
    inputs: [{ name: '_id', internalType: 'uint256', type: 'uint256' }],
    name: 'getCampaignImages',
    outputs: [{ name: '', internalType: 'string[]', type: 'string[]' }],
    stateMutability: 'view',
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
          { name: 'cancelled', internalType: 'bool', type: 'bool' },
          { name: 'withdrawn', internalType: 'bool', type: 'bool' },
          { name: 'refundsEnabled', internalType: 'bool', type: 'bool' },
          {
            name: 'additionalImages',
            internalType: 'string[]',
            type: 'string[]',
          },
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
  {
    type: 'function',
    inputs: [{ name: '_id', internalType: 'uint256', type: 'uint256' }],
    name: 'processRefunds',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_id', internalType: 'uint256', type: 'uint256' }],
    name: 'withdrawFunds',
    outputs: [],
    stateMutability: 'nonpayable',
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
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"MAX_CAMPAIGN_IMAGES"`
 */
export const useReadCrowdFundingMaxCampaignImages =
  /*#__PURE__*/ createUseReadContract({
    abi: crowdFundingAbi,
    functionName: 'MAX_CAMPAIGN_IMAGES',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"MAX_IMAGE_URL_BYTES"`
 */
export const useReadCrowdFundingMaxImageUrlBytes =
  /*#__PURE__*/ createUseReadContract({
    abi: crowdFundingAbi,
    functionName: 'MAX_IMAGE_URL_BYTES',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"REFUND_DELAY"`
 */
export const useReadCrowdFundingRefundDelay =
  /*#__PURE__*/ createUseReadContract({
    abi: crowdFundingAbi,
    functionName: 'REFUND_DELAY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"campaigns"`
 */
export const useReadCrowdFundingCampaigns = /*#__PURE__*/ createUseReadContract(
  { abi: crowdFundingAbi, functionName: 'campaigns' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"contributions"`
 */
export const useReadCrowdFundingContributions =
  /*#__PURE__*/ createUseReadContract({
    abi: crowdFundingAbi,
    functionName: 'contributions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"getCampaignImages"`
 */
export const useReadCrowdFundingGetCampaignImages =
  /*#__PURE__*/ createUseReadContract({
    abi: crowdFundingAbi,
    functionName: 'getCampaignImages',
  })

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
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"cancelCampaign"`
 */
export const useWriteCrowdFundingCancelCampaign =
  /*#__PURE__*/ createUseWriteContract({
    abi: crowdFundingAbi,
    functionName: 'cancelCampaign',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"claimRefund"`
 */
export const useWriteCrowdFundingClaimRefund =
  /*#__PURE__*/ createUseWriteContract({
    abi: crowdFundingAbi,
    functionName: 'claimRefund',
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
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"processRefunds"`
 */
export const useWriteCrowdFundingProcessRefunds =
  /*#__PURE__*/ createUseWriteContract({
    abi: crowdFundingAbi,
    functionName: 'processRefunds',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"withdrawFunds"`
 */
export const useWriteCrowdFundingWithdrawFunds =
  /*#__PURE__*/ createUseWriteContract({
    abi: crowdFundingAbi,
    functionName: 'withdrawFunds',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link crowdFundingAbi}__
 */
export const useSimulateCrowdFunding = /*#__PURE__*/ createUseSimulateContract({
  abi: crowdFundingAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"cancelCampaign"`
 */
export const useSimulateCrowdFundingCancelCampaign =
  /*#__PURE__*/ createUseSimulateContract({
    abi: crowdFundingAbi,
    functionName: 'cancelCampaign',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"claimRefund"`
 */
export const useSimulateCrowdFundingClaimRefund =
  /*#__PURE__*/ createUseSimulateContract({
    abi: crowdFundingAbi,
    functionName: 'claimRefund',
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

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"processRefunds"`
 */
export const useSimulateCrowdFundingProcessRefunds =
  /*#__PURE__*/ createUseSimulateContract({
    abi: crowdFundingAbi,
    functionName: 'processRefunds',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link crowdFundingAbi}__ and `functionName` set to `"withdrawFunds"`
 */
export const useSimulateCrowdFundingWithdrawFunds =
  /*#__PURE__*/ createUseSimulateContract({
    abi: crowdFundingAbi,
    functionName: 'withdrawFunds',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link crowdFundingAbi}__
 */
export const useWatchCrowdFundingEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: crowdFundingAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link crowdFundingAbi}__ and `eventName` set to `"CampaignCancelled"`
 */
export const useWatchCrowdFundingCampaignCancelledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: crowdFundingAbi,
    eventName: 'CampaignCancelled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link crowdFundingAbi}__ and `eventName` set to `"CampaignCreated"`
 */
export const useWatchCrowdFundingCampaignCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: crowdFundingAbi,
    eventName: 'CampaignCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link crowdFundingAbi}__ and `eventName` set to `"DonationReceived"`
 */
export const useWatchCrowdFundingDonationReceivedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: crowdFundingAbi,
    eventName: 'DonationReceived',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link crowdFundingAbi}__ and `eventName` set to `"FundsWithdrawn"`
 */
export const useWatchCrowdFundingFundsWithdrawnEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: crowdFundingAbi,
    eventName: 'FundsWithdrawn',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link crowdFundingAbi}__ and `eventName` set to `"RefundClaimed"`
 */
export const useWatchCrowdFundingRefundClaimedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: crowdFundingAbi,
    eventName: 'RefundClaimed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link crowdFundingAbi}__ and `eventName` set to `"RefundsProcessed"`
 */
export const useWatchCrowdFundingRefundsProcessedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: crowdFundingAbi,
    eventName: 'RefundsProcessed',
  })
