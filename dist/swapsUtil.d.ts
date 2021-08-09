import { Transaction } from '@metamask/controllers';
import { AbortSignal } from 'abort-controller';
import BigNumber from 'bignumber.js';
import { APIAggregatorMetadata, SwapsAsset, SwapsToken, APIType, Quote, APIFetchQuotesParams, QuoteValues, TransactionReceipt } from './swapsInterfaces';
export declare const ETH_CHAIN_ID = "1";
export declare const BSC_CHAIN_ID = "56";
export declare const SWAPS_TESTNET_CHAIN_ID = "1337";
export declare const ETH_SWAPS_CONTRACT_ADDRESS = "0x881d40237659c251811cec9c364ef91dc08d300c";
export declare const BSC_SWAPS_CONTRACT_ADDRESS = "0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31";
export declare const SWAPS_CONTRACT_ADDRESSES: {
    [key: string]: string;
};
export declare const NATIVE_SWAPS_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
export declare const ETH_SWAPS_TOKEN_OBJECT: SwapsToken;
export declare const BSC_SWAPS_TOKEN_OBJECT: SwapsToken;
export declare const DEFAULT_ERC20_APPROVE_GAS = "0x1d4c0";
export declare enum SwapsError {
    QUOTES_EXPIRED_ERROR = "quotes-expired",
    SWAP_FAILED_ERROR = "swap-failed-error",
    ERROR_FETCHING_QUOTES = "error-fetching-quotes",
    QUOTES_NOT_AVAILABLE_ERROR = "quotes-not-available",
    OFFLINE_FOR_MAINTENANCE = "offline-for-maintenance",
    SWAPS_FETCH_ORDER_CONFLICT = "swaps-fetch-order-conflict",
    SWAPS_GAS_PRICE_ESTIMATION = "swaps-gas-price-estimation",
    SWAPS_ALLOWANCE_TIMEOUT = "swaps-allowance-timeout",
    SWAPS_ALLOWANCE_ERROR = "swaps-allowance-error"
}
export declare function getNativeSwapsToken(chainId: string): SwapsToken;
export declare function getSwapsContractAddress(chainId: string): string;
export declare const getBaseApiURL: (type: APIType, chainId: string) => string;
export declare function fetchTradesInfo({ slippage, sourceToken, sourceAmount, destinationToken, walletAddress, exchangeList, }: APIFetchQuotesParams, abortSignal: AbortSignal | null, chainId: string, clientId?: string): Promise<{
    [key: string]: Quote;
}>;
export declare function fetchTokens(chainId: string): Promise<SwapsToken[]>;
export declare function fetchAggregatorMetadata(chainId: string): Promise<{
    [key: string]: APIAggregatorMetadata;
}>;
export declare function fetchTopAssets(chainId: string): Promise<SwapsAsset[]>;
export declare function fetchSwapsFeatureLiveness(chainId: string): Promise<boolean>;
export declare function fetchGasPrices(chainId: string): Promise<{
    safeGasPrice: string;
    proposedGasPrice: string;
    fastGasPrice: string;
}>;
export declare function calculateGasEstimateWithRefund(maxGas: number | null, estimatedRefund: number | null, estimatedGas: string | null): BigNumber;
/**
 * Calculates token received from a transaction receipt together with an approval transaction receipt
 *
 * @param receipt - Swap transaction receipt
 * @param approvalReceipt - Approval transaction receipt needed for swaps if any
 * @param transaction - Swap transaction object
 * @param approvalTransaction - Approval transaction object needed for swaps if any
 * @param destinationToken - Destination token object
 * @param previousBalance - Previous swap ETH balance
 * @param postBalance - Post swap ETH balance
 * @returns - Tokens received in hex minimal unit
 */
export declare function getSwapsTokensReceived(receipt: TransactionReceipt, approvalReceipt: TransactionReceipt | null, transaction: Transaction, approvalTransaction: Transaction, destinationToken: SwapsToken, previousBalance: string, postBalance: string): string | undefined;
/**
 * Calculates the median of a sample of BigNumber values.
 *
 * @param {BigNumber[]} values - A sample of BigNumber values.
 * @returns {BigNumber} The median of the sample.
 */
export declare function getMedian(values: BigNumber[]): BigNumber;
/**
 * Calculates the median overallValueOfQuote of a sample of quotes.
 *
 * @param {Array} quotes - A sample of quote objects with overallValueOfQuote, ethFee, metaMaskFeeInEth, and ethValueOfTokens properties
 * @returns {Object} An object with the ethValueOfTokens, ethFee, and metaMaskFeeInEth of the quote with the median overallValueOfQuote
 */
export declare function getMedianEthValueQuote(quotes: QuoteValues[]): {
    ethFee: string;
    metaMaskFeeInEth: string;
    ethValueOfTokens: string;
};
export declare function calculateGasLimits(approvalNeeded: boolean, gasEstimateWithRefund: string | null, gasEstimate: string | null, averageGas: number, maxGas: number, gasMultiplier: number, gasLimit: string | null): {
    tradeGasLimit: BigNumber;
    tradeMaxGasLimit: BigNumber;
};
export declare function calcTokenAmount(value: number | BigNumber, decimals: number): BigNumber;
/**
 * Estimates required gas for a given transaction
 *
 * @param transaction - Transaction object to estimate gas for
 * @returns - Promise resolving to an object containing gas and gasPrice
 */
export declare function estimateGas(transaction: Transaction, ethQuery: any): Promise<{
    blockGasLimit: any;
    gas: string;
}>;
/**
 * Given the standard set of information about a transaction, returns a transaction properly formatted for
 * publishing via JSON RPC and web3
 *
 * @param {boolean} [sendToken] - Indicates whether or not the transaciton is a token transaction
 * @param {string} data - A hex string containing the data to include in the transaction
 * @param {string} to - A hex address of the tx recipient address
 * @param {string} amount - A hex amount, in case of a token tranaction will be set to Tx value
 * @param {string} from - A hex address of the tx sender address
 * @param {string} gas - A hex representation of the gas value for the transaction
 * @param {string} gasPrice - A hex representation of the gas price for the transaction
 * @returns {object} An object ready for submission to the blockchain, with all values appropriately hex prefixed
 */
export declare function constructTxParams({ sendToken, data, to, amount, from, gas, gasPrice, }: {
    sendToken?: boolean;
    data?: string;
    to?: string;
    from: string;
    gas?: string;
    gasPrice?: string;
    amount?: string;
}): any;
