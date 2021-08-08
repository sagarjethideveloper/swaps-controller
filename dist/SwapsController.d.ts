import { BaseController, BaseConfig, BaseState, Transaction } from '@metamask/controllers';
import { SwapsError } from './swapsUtil';
import { APIAggregatorMetadata, APIFetchQuotesMetadata, APIFetchQuotesParams, ChainData, ChainCache, Quote, QuoteSavings, QuoteValues, SwapsAsset, SwapsToken } from './swapsInterfaces';
export interface SwapsConfig extends BaseConfig {
    clientId?: string;
    maxGasLimit: number;
    pollCountLimit: number;
    fetchAggregatorMetadataThreshold: number;
    fetchTokensThreshold: number;
    fetchTopAssetsThreshold: number;
    provider: any;
    chainId: string;
    supportedChainIds: string[];
}
export interface SwapsState extends BaseState {
    quotes: {
        [key: string]: Quote;
    };
    fetchParams: APIFetchQuotesParams;
    fetchParamsMetaData: APIFetchQuotesMetadata;
    topAggSavings: QuoteSavings | null;
    quotesLastFetched: null | number;
    error: {
        key: null | SwapsError;
        description: null | string;
    };
    topAggId: null | string;
    isInPolling: boolean;
    pollingCyclesLeft: number;
    approvalTransaction: Transaction | null;
    quoteValues: {
        [key: string]: QuoteValues;
    } | null;
    quoteRefreshSeconds: number | null;
    usedGasPrice: string | null;
    aggregatorMetadata: null | {
        [key: string]: APIAggregatorMetadata;
    };
    aggregatorMetadataLastFetched: number;
    tokens: null | SwapsToken[];
    tokensLastFetched: number;
    topAssets: null | SwapsAsset[];
    topAssetsLastFetched: number;
    chainCache: ChainCache;
}
export declare const INITIAL_CHAIN_DATA: ChainData;
export declare class SwapsController extends BaseController<SwapsConfig, SwapsState> {
    private handle?;
    private web3;
    private ethQuery;
    private pollCount;
    private mutex;
    private abortController?;
    /**
     * Fetch current gas price
     *
     * @returns - Promise resolving to the current gas price or throw an error
     */
    private getGasPrice;
    /**
     * Calculates a quote `QuotesValue`
     *
     * @param quote - Specific quote object
     * @param gasPrice - Gas price in hex format to calculate the `QuotesValue` with
     */
    private calculateQuoteValues;
    private calculatesCustomLimitMaxEthFee;
    /**
     * Find best quote and quotes calculated values
     *
     * @param quotes - Array of quotes
     * @returns - Promise resolving to the best quote object and values from quotes
     */
    private getBestQuoteAndQuotesValues;
    /**
     * Get current allowance for a wallet address to access ERC20 contract address funds
     * it will throw after 10 secs
     *
     * @param contractAddress - Hex address of the ERC20 contract
     * @param walletAddress - Hex address of the wallet
     * @returns - Promise resolving to allowance number
     */
    private getERC20Allowance;
    private timedoutGasReturn;
    private pollForNewQuotesWithThreshold;
    private getAllQuotesWithGasEstimates;
    private fetchQuotes;
    /**
     * Name of this controller used during composition
     */
    name: string;
    /**
     * List of required sibling controllers this controller needs to function
     */
    requiredControllers: never[];
    /**
     * Creates a SwapsController instance
     *
     * @param config - Initial options used to configure this controller
     * @param state - Initial state to set on this controller
     */
    constructor(config?: Partial<SwapsConfig>, state?: Partial<SwapsState>);
    set provider(provider: any);
    set chainId(chainId: string);
    /**
     * Updates all quotes with a new custom gas price
     *
     * @param customGasPrice - Custom gas price in hex format
     */
    updateQuotesWithGasPrice(customGasPrice: string): void;
    /**
     * Updates the selected quote maxEthFee param according to a custom gas limit
     *
     * @param customGasLimit - Custom gas limit in hex format
     */
    updateSelectedQuoteWithGasLimit(customGasLimit: string): void;
    startFetchAndSetQuotes(fetchParams: APIFetchQuotesParams, fetchParamsMetaData: APIFetchQuotesMetadata): null | undefined;
    fetchTokenWithCache(): Promise<void>;
    fetchTopAssetsWithCache(): Promise<void>;
    fetchAggregatorMetadataWithCache(): Promise<void>;
    /**
     * Stops the polling process
     *
     */
    stopPollingAndResetState(error?: {
        key: SwapsError | null;
        description: string | null;
    }): void;
}
export default SwapsController;
