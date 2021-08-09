"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapsController = exports.INITIAL_CHAIN_DATA = void 0;
const controllers_1 = require("@metamask/controllers");
const abort_controller_1 = __importDefault(require("abort-controller"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const eth_query_1 = __importDefault(require("eth-query"));
const human_standard_token_abi_1 = __importDefault(require("human-standard-token-abi"));
const async_mutex_1 = require("async-mutex");
const web3_1 = __importDefault(require("web3"));
const swapsUtil_1 = require("./swapsUtil");
exports.INITIAL_CHAIN_DATA = {
    aggregatorMetadata: null,
    tokens: null,
    topAssets: null,
    aggregatorMetadataLastFetched: 0,
    topAssetsLastFetched: 0,
    tokensLastFetched: 0,
};
/**
 * Gets a new chainCache for a chainId with updated data
 * @param chainCache Current chainCache from state
 * @param chainId Current chainId from the config
 * @param data Data to be updated
 * @returns chainCache with updated data
 */
function getNewChainCache(chainCache, chainId, data) {
    return Object.assign(Object.assign({}, chainCache), { [chainId]: Object.assign(Object.assign({}, chainCache === null || chainCache === void 0 ? void 0 : chainCache[chainId]), data) });
}
class SwapsController extends controllers_1.BaseController {
    /**
     * Creates a SwapsController instance
     *
     * @param config - Initial options used to configure this controller
     * @param state - Initial state to set on this controller
     */
    constructor(config, state) {
        super(config, state);
        this.pollCount = 0;
        this.mutex = new async_mutex_1.Mutex();
        /**
         * Name of this controller used during composition
         */
        this.name = 'SwapsController';
        /**
         * List of required sibling controllers this controller needs to function
         */
        this.requiredControllers = [];
        this.defaultConfig = {
            maxGasLimit: 2500000,
            pollCountLimit: 3,
            fetchAggregatorMetadataThreshold: 1000 * 60 * 60 * 24 * 15,
            fetchTokensThreshold: 1000 * 60 * 60 * 24,
            fetchTopAssetsThreshold: 1000 * 60 * 30,
            provider: undefined,
            chainId: '1',
            supportedChainIds: [swapsUtil_1.ETH_CHAIN_ID, swapsUtil_1.BSC_CHAIN_ID, swapsUtil_1.SWAPS_TESTNET_CHAIN_ID],
            clientId: undefined,
        };
        this.defaultState = {
            quotes: {},
            quoteValues: {},
            fetchParams: {
                slippage: 0,
                sourceToken: '',
                sourceAmount: 0,
                destinationToken: '',
                walletAddress: '',
            },
            fetchParamsMetaData: {
                sourceTokenInfo: {
                    decimals: 0,
                    address: '',
                    symbol: '',
                },
                destinationTokenInfo: {
                    decimals: 0,
                    address: '',
                    symbol: '',
                },
                accountBalance: '0x',
            },
            topAggSavings: null,
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            approvalTransaction: null,
            aggregatorMetadataLastFetched: 0,
            quotesLastFetched: 0,
            topAssetsLastFetched: 0,
            error: { key: null, description: null },
            topAggId: null,
            tokensLastFetched: 0,
            isInPolling: false,
            pollingCyclesLeft: (config === null || config === void 0 ? void 0 : config.pollCountLimit) || 3,
            quoteRefreshSeconds: null,
            usedGasPrice: null,
            chainCache: {
                '1': exports.INITIAL_CHAIN_DATA,
            },
        };
        this.initialize();
    }
    /**
     * Fetch current gas price
     *
     * @returns - Promise resolving to the current gas price or throw an error
     */
    getGasPrice() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { proposedGasPrice } = yield swapsUtil_1.fetchGasPrices(this.config.chainId);
                return proposedGasPrice;
            }
            catch (e) {
                //
            }
            try {
                const gasPrice = yield controllers_1.util.query(this.ethQuery, 'gasPrice');
                return gasPrice;
            }
            catch (e) {
                //
            }
            throw new Error(swapsUtil_1.SwapsError.SWAPS_GAS_PRICE_ESTIMATION);
        });
    }
    /**
     * Calculates a quote `QuotesValue`
     *
     * @param quote - Specific quote object
     * @param gasPrice - Gas price in hex format to calculate the `QuotesValue` with
     */
    calculateQuoteValues(quote, gasPrice, gasLimit) {
        const { destinationTokenInfo, destinationTokenConversionRate, } = this.state.fetchParamsMetaData;
        const { aggregator, averageGas, maxGas, destinationAmount = 0, fee: metaMaskFee, sourceAmount, sourceToken, trade, gasEstimateWithRefund, gasEstimate, gasMultiplier, approvalNeeded, } = quote;
        // trade gas
        const { tradeGasLimit, tradeMaxGasLimit } = swapsUtil_1.calculateGasLimits(Boolean(approvalNeeded), gasEstimateWithRefund, gasEstimate, averageGas, maxGas, gasMultiplier, gasLimit);
        const totalGasInWei = tradeGasLimit.times(gasPrice, 16);
        const maxTotalGasInWei = tradeMaxGasLimit.times(gasPrice, 16);
        // totalGas + trade value
        // trade.value is a sum of different values depending on the transaction.
        // It always includes any external fees charged by the quote source. In
        // addition, if the source asset is NATIVE, trade.value includes the amount
        // of swapped NATIVE.
        const totalInWei = totalGasInWei.plus(trade.value, 16);
        const maxTotalInWei = maxTotalGasInWei.plus(trade.value, 16);
        // if value in trade, NATIVE fee will be the gas, if not it will be the total wei
        const weiFee = sourceToken === swapsUtil_1.NATIVE_SWAPS_TOKEN_ADDRESS
            ? totalInWei.minus(sourceAmount, 10)
            : totalInWei; // sourceAmount is in wei : totalInWei;
        const maxWeiFee = sourceToken === swapsUtil_1.NATIVE_SWAPS_TOKEN_ADDRESS
            ? maxTotalInWei.minus(sourceAmount, 10)
            : maxTotalInWei; // sourceAmount is in wei : totalInWei;
        const ethFee = swapsUtil_1.calcTokenAmount(weiFee, 18);
        const maxEthFee = swapsUtil_1.calcTokenAmount(maxWeiFee, 18);
        const decimalAdjustedDestinationAmount = swapsUtil_1.calcTokenAmount(destinationAmount, destinationTokenInfo.decimals);
        // fees
        const tokenPercentageOfPreFeeDestAmount = new bignumber_js_1.default(100, 10)
            .minus(metaMaskFee, 10)
            .div(100);
        const destinationAmountBeforeMetaMaskFee = decimalAdjustedDestinationAmount.div(tokenPercentageOfPreFeeDestAmount);
        const metaMaskFeeInTokens = destinationAmountBeforeMetaMaskFee.minus(decimalAdjustedDestinationAmount);
        const conversionRate = destinationTokenConversionRate || 1;
        const ethValueOfTokens = decimalAdjustedDestinationAmount.times(conversionRate, 10);
        // the more tokens the better
        const overallValueOfQuote = ethValueOfTokens.minus(ethFee, 10);
        const quoteValues = {
            aggregator,
            ethFee: ethFee.toFixed(18),
            maxEthFee: maxEthFee.toFixed(18),
            ethValueOfTokens: ethValueOfTokens.toFixed(18),
            overallValueOfQuote: overallValueOfQuote.toFixed(18),
            metaMaskFeeInEth: metaMaskFeeInTokens.times(conversionRate).toFixed(18),
        };
        return quoteValues;
    }
    calculatesCustomLimitMaxEthFee(quote, gasPrice, gasLimit) {
        const { averageGas, maxGas, sourceAmount, sourceToken, trade, gasEstimateWithRefund, gasEstimate, gasMultiplier, approvalNeeded, } = quote;
        const { tradeMaxGasLimit } = swapsUtil_1.calculateGasLimits(Boolean(approvalNeeded), gasEstimateWithRefund, gasEstimate, averageGas, maxGas, gasMultiplier, gasLimit);
        const maxTotalGasInWei = tradeMaxGasLimit.times(gasPrice, 16);
        const maxTotalInWei = maxTotalGasInWei.plus(trade.value, 16);
        const maxWeiFee = sourceToken === swapsUtil_1.NATIVE_SWAPS_TOKEN_ADDRESS
            ? maxTotalInWei.minus(sourceAmount, 10)
            : maxTotalInWei;
        const maxEthFee = swapsUtil_1.calcTokenAmount(maxWeiFee, 18).toFixed(18);
        return maxEthFee;
    }
    /**
     * Find best quote and quotes calculated values
     *
     * @param quotes - Array of quotes
     * @returns - Promise resolving to the best quote object and values from quotes
     */
    getBestQuoteAndQuotesValues(quotes, usedGasPrice) {
        let topAggId = '';
        let overallValueOfBestQuoteForSorting = null;
        const quoteValues = {};
        Object.values(quotes).forEach((quote) => {
            const quoteValue = this.calculateQuoteValues(quote, usedGasPrice, null);
            quoteValues[quoteValue.aggregator] = quoteValue;
            const bnOverallValueOfQuote = new bignumber_js_1.default(quoteValue.overallValueOfQuote);
            if (!overallValueOfBestQuoteForSorting ||
                bnOverallValueOfQuote.gt(overallValueOfBestQuoteForSorting)) {
                topAggId = quote.aggregator;
                overallValueOfBestQuoteForSorting = bnOverallValueOfQuote;
            }
        });
        return { topAggId, quoteValues };
    }
    /**
     * Get current allowance for a wallet address to access ERC20 contract address funds
     * it will throw after 10 secs
     *
     * @param contractAddress - Hex address of the ERC20 contract
     * @param walletAddress - Hex address of the wallet
     * @returns - Promise resolving to allowance number
     */
    getERC20Allowance(contractAddress, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const contract = this.web3.eth.contract(human_standard_token_abi_1.default).at(contractAddress);
            const allowanceTimeout = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(swapsUtil_1.SwapsError.SWAPS_ALLOWANCE_TIMEOUT));
                }, 10000);
            });
            const allowancePromise = new Promise((resolve, reject) => {
                contract.allowance(walletAddress, swapsUtil_1.getSwapsContractAddress(this.config.chainId), (error, result) => {
                    /* istanbul ignore if */
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(result);
                });
            });
            return Promise.race([
                allowanceTimeout,
                allowancePromise,
            ]);
        });
    }
    timedoutGasReturn(tradeTxParams) {
        if (!tradeTxParams) {
            return new Promise((resolve) => {
                resolve({ gas: null });
            });
        }
        const gasTimeout = new Promise((resolve) => {
            setTimeout(() => {
                resolve({ gas: null });
            }, 5000);
        });
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            const tradeTxParamsForGasEstimate = {
                data: tradeTxParams.data,
                from: tradeTxParams.from,
                to: tradeTxParams.to,
                value: tradeTxParams.value,
            };
            try {
                const gas = (yield Promise.race([
                    swapsUtil_1.estimateGas(tradeTxParamsForGasEstimate, this.ethQuery),
                    gasTimeout,
                ]));
                resolve(gas);
            }
            catch (e) {
                resolve({ gas: null });
            }
        }));
    }
    pollForNewQuotesWithThreshold(fetchThreshold = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            this.pollCount += 1;
            this.handle && clearTimeout(this.handle);
            if (this.pollCount < this.config.pollCountLimit + 1) {
                !this.state.isInPolling && this.update({ isInPolling: true });
                const { nextQuotesState, threshold, usedGasPrice, } = yield this.fetchQuotes();
                this.update({
                    pollingCyclesLeft: this.config.pollCountLimit - this.pollCount,
                });
                if (threshold && (nextQuotesState === null || nextQuotesState === void 0 ? void 0 : nextQuotesState.quoteRefreshSeconds)) {
                    this.update(Object.assign(Object.assign(Object.assign({}, this.state), nextQuotesState), { usedGasPrice }));
                    this.handle = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                        this.pollForNewQuotesWithThreshold(threshold);
                    }), nextQuotesState.quoteRefreshSeconds * 1000 - threshold);
                }
            }
            else {
                this.handle = setTimeout(() => {
                    this.stopPollingAndResetState({
                        key: swapsUtil_1.SwapsError.QUOTES_EXPIRED_ERROR,
                        description: null,
                    });
                }, fetchThreshold);
            }
        });
    }
    getAllQuotesWithGasEstimates(trades) {
        return __awaiter(this, void 0, void 0, function* () {
            const quoteGasData = yield Promise.all(Object.values(trades).map((trade) => {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const { gas } = yield this.timedoutGasReturn(trade.trade);
                        resolve({
                            gas,
                            aggId: trade.aggregator,
                        });
                    }
                    catch (e) {
                        reject(e);
                    }
                }));
            }));
            const newQuotes = {};
            quoteGasData.forEach(({ gas, aggId }) => {
                newQuotes[aggId] = Object.assign(Object.assign({}, trades[aggId]), { gasEstimate: gas, gasEstimateWithRefund: swapsUtil_1.calculateGasEstimateWithRefund(trades[aggId].maxGas, trades[aggId].estimatedRefund, gas).toString(16) });
            });
            return newQuotes;
        });
    }
    fetchQuotes() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const timeStarted = Date.now();
            const { fetchParams } = this.state;
            const { clientId, chainId } = this.config;
            try {
                /** We need to abort quotes fetch if stopPollingAndResetState is called while getting quotes */
                this.abortController = new abort_controller_1.default();
                const { signal } = this.abortController;
                let quotes = yield swapsUtil_1.fetchTradesInfo(fetchParams, signal, chainId, clientId);
                if (Object.values(quotes).length === 0) {
                    throw new Error(swapsUtil_1.SwapsError.QUOTES_NOT_AVAILABLE_ERROR);
                }
                let approvalTransaction = null;
                if (fetchParams.sourceToken !== swapsUtil_1.NATIVE_SWAPS_TOKEN_ADDRESS) {
                    const allowance = yield this.getERC20Allowance(fetchParams.sourceToken, fetchParams.walletAddress);
                    if (Number(allowance) < fetchParams.sourceAmount) {
                        approvalTransaction = Object.values(quotes)[0].approvalNeeded;
                        if (!approvalTransaction) {
                            throw new Error(swapsUtil_1.SwapsError.SWAPS_ALLOWANCE_ERROR);
                        }
                        const { gas: approvalGas } = yield this.timedoutGasReturn({
                            data: approvalTransaction.data,
                            from: approvalTransaction.from,
                            to: approvalTransaction.to,
                        });
                        approvalTransaction = Object.assign(Object.assign({}, approvalTransaction), { gas: approvalGas || swapsUtil_1.DEFAULT_ERC20_APPROVE_GAS });
                    }
                }
                quotes = yield this.getAllQuotesWithGasEstimates(quotes);
                const usedGasPrice = yield this.getGasPrice();
                const { topAggId, quoteValues } = this.getBestQuoteAndQuotesValues(quotes, usedGasPrice);
                const quotesLastFetched = Date.now();
                const nextQuotesState = {
                    quotes,
                    quotesLastFetched,
                    approvalTransaction,
                    topAggId: (_a = quotes[topAggId]) === null || _a === void 0 ? void 0 : _a.aggregator,
                    quoteValues,
                    quoteRefreshSeconds: (_b = quotes[topAggId]) === null || _b === void 0 ? void 0 : _b.quoteRefreshSeconds,
                };
                return {
                    nextQuotesState,
                    threshold: quotesLastFetched - timeStarted,
                    usedGasPrice,
                };
            }
            catch (e) {
                const errorKey = Object.values(swapsUtil_1.SwapsError).includes(e.message)
                    ? e.message
                    : swapsUtil_1.SwapsError.ERROR_FETCHING_QUOTES;
                this.stopPollingAndResetState({ key: errorKey, description: e });
                return { nextQuotesState: null, threshold: null, usedGasPrice: null };
            }
        });
    }
    set provider(provider) {
        if (provider) {
            this.ethQuery = new eth_query_1.default(provider);
            this.web3 = new web3_1.default(provider);
        }
    }
    set chainId(chainId) {
        if (!this.config.supportedChainIds.includes(chainId)) {
            return;
        }
        const { chainCache } = this.state;
        if ((chainCache === null || chainCache === void 0 ? void 0 : chainCache[chainId]) === undefined) {
            this.update(Object.assign(Object.assign({}, exports.INITIAL_CHAIN_DATA), { chainCache: getNewChainCache(chainCache, chainId, exports.INITIAL_CHAIN_DATA) }));
            return;
        }
        const cachedData = (chainCache === null || chainCache === void 0 ? void 0 : chainCache[chainId]) || exports.INITIAL_CHAIN_DATA;
        this.update(Object.assign({}, cachedData));
    }
    /**
     * Updates all quotes with a new custom gas price
     *
     * @param customGasPrice - Custom gas price in hex format
     */
    updateQuotesWithGasPrice(customGasPrice) {
        const { quotes } = this.state;
        const { topAggId, quoteValues } = this.getBestQuoteAndQuotesValues(quotes, customGasPrice);
        this.update({ topAggId, quoteValues });
    }
    /**
     * Updates the selected quote maxEthFee param according to a custom gas limit
     *
     * @param customGasLimit - Custom gas limit in hex format
     */
    updateSelectedQuoteWithGasLimit(customGasLimit) {
        const { topAggId, quotes, quoteValues, usedGasPrice } = this.state;
        if (!topAggId || !quoteValues || !usedGasPrice) {
            return;
        }
        const selectedQuote = quotes[topAggId];
        const maxEthFee = this.calculatesCustomLimitMaxEthFee(selectedQuote, usedGasPrice, customGasLimit);
        quoteValues[selectedQuote.aggregator].maxEthFee = maxEthFee;
        this.update({ topAggId, quoteValues });
    }
    startFetchAndSetQuotes(fetchParams, fetchParamsMetaData) {
        if (!fetchParams) {
            return null;
        }
        // Every time we get a new request that is not from the polling,
        // we reset the poll count so we can poll for up to three more sets
        // of quotes with these new params.
        this.pollCount = 0;
        this.update({ fetchParams, fetchParamsMetaData });
        this.pollForNewQuotesWithThreshold();
    }
    fetchTokenWithCache() {
        return __awaiter(this, void 0, void 0, function* () {
            const { chainId, fetchTokensThreshold } = this.config;
            const { tokens, tokensLastFetched } = this.state;
            if (!tokens || fetchTokensThreshold < Date.now() - tokensLastFetched) {
                const releaseLock = yield this.mutex.acquire();
                try {
                    const newTokens = yield swapsUtil_1.fetchTokens(chainId);
                    const data = { tokens: newTokens, tokensLastFetched: Date.now() };
                    this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
                }
                catch (_a) {
                    const data = { tokensLastFetched: 0 };
                    this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
                }
                finally {
                    releaseLock();
                }
            }
        });
    }
    fetchTopAssetsWithCache() {
        return __awaiter(this, void 0, void 0, function* () {
            const { chainId, fetchTopAssetsThreshold } = this.config;
            const { topAssets, topAssetsLastFetched } = this.state;
            if (!topAssets ||
                fetchTopAssetsThreshold < Date.now() - topAssetsLastFetched) {
                const releaseLock = yield this.mutex.acquire();
                try {
                    const newTopAssets = yield swapsUtil_1.fetchTopAssets(chainId);
                    const data = {
                        topAssets: newTopAssets,
                        topAssetsLastFetched: Date.now(),
                    };
                    this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
                }
                catch (_a) {
                    const data = { topAssetsLastFetched: 0 };
                    this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
                }
                finally {
                    releaseLock();
                }
            }
        });
    }
    fetchAggregatorMetadataWithCache() {
        return __awaiter(this, void 0, void 0, function* () {
            const { chainId, fetchAggregatorMetadataThreshold } = this.config;
            const { aggregatorMetadata, aggregatorMetadataLastFetched } = this.state;
            if (!aggregatorMetadata ||
                fetchAggregatorMetadataThreshold <
                    Date.now() - aggregatorMetadataLastFetched) {
                const releaseLock = yield this.mutex.acquire();
                try {
                    const newAggregatorMetada = yield swapsUtil_1.fetchAggregatorMetadata(chainId);
                    const data = {
                        aggregatorMetadata: newAggregatorMetada,
                        aggregatorMetadataLastFetched: Date.now(),
                    };
                    this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
                }
                catch (_a) {
                    const data = { aggregatorMetadataLastFetched: 0 };
                    this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
                }
                finally {
                    releaseLock();
                }
            }
        });
    }
    /**
     * Stops the polling process
     *
     */
    stopPollingAndResetState(error) {
        this.abortController && this.abortController.abort();
        this.handle && clearTimeout(this.handle);
        this.pollCount = this.config.pollCountLimit + 1;
        this.update(Object.assign(Object.assign({}, this.defaultState), { isInPolling: false, tokensLastFetched: this.state.tokensLastFetched, topAssetsLastFetched: this.state.topAssetsLastFetched, aggregatorMetadataLastFetched: this.state.aggregatorMetadataLastFetched, tokens: this.state.tokens, topAssets: this.state.topAssets, aggregatorMetadata: this.state.aggregatorMetadata, chainCache: this.state.chainCache, error }));
    }
}
exports.SwapsController = SwapsController;
exports.default = SwapsController;
//# sourceMappingURL=SwapsController.js.map