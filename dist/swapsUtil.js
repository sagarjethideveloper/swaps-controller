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
exports.constructTxParams = exports.estimateGas = exports.calcTokenAmount = exports.calculateGasLimits = exports.getMedianEthValueQuote = exports.getMedian = exports.getSwapsTokensReceived = exports.calculateGasEstimateWithRefund = exports.fetchGasPrices = exports.fetchSwapsFeatureLiveness = exports.fetchTopAssets = exports.fetchAggregatorMetadata = exports.fetchTokens = exports.fetchTradesInfo = exports.getBaseApiURL = exports.isValidContractAddress = exports.getSwapsContractAddress = exports.getNativeSwapsToken = exports.SwapsError = exports.DEFAULT_ERC20_APPROVE_GAS = exports.BSC_SWAPS_TOKEN_OBJECT = exports.ETH_SWAPS_TOKEN_OBJECT = exports.NATIVE_SWAPS_TOKEN_ADDRESS = exports.ALLOWED_CONTRACT_ADDRESSES = exports.SWAPS_CONTRACT_ADDRESSES = exports.WETH_CONTRACT_ADDRESS = exports.BSC_SWAPS_CONTRACT_ADDRESS = exports.ETH_SWAPS_CONTRACT_ADDRESS = exports.SWAPS_TESTNET_CHAIN_ID = exports.BSC_CHAIN_ID = exports.ETH_CHAIN_ID = void 0;
const controllers_1 = require("@metamask/controllers");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ethereumjs_util_1 = require("ethereumjs-util");
const swapsInterfaces_1 = require("./swapsInterfaces");
const { handleFetch, timeoutFetch, BNToHex, query, normalizeTransaction, } = controllers_1.util;
exports.ETH_CHAIN_ID = '1';
exports.BSC_CHAIN_ID = '56';
exports.SWAPS_TESTNET_CHAIN_ID = '1337';
exports.ETH_SWAPS_CONTRACT_ADDRESS = '0x881d40237659c251811cec9c364ef91dc08d300c';
exports.BSC_SWAPS_CONTRACT_ADDRESS = '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31';
exports.WETH_CONTRACT_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
exports.SWAPS_CONTRACT_ADDRESSES = {
    [exports.ETH_CHAIN_ID]: exports.ETH_SWAPS_CONTRACT_ADDRESS,
    [exports.SWAPS_TESTNET_CHAIN_ID]: exports.ETH_SWAPS_CONTRACT_ADDRESS,
    [exports.BSC_CHAIN_ID]: exports.BSC_SWAPS_CONTRACT_ADDRESS,
};
exports.ALLOWED_CONTRACT_ADDRESSES = {
    [exports.ETH_CHAIN_ID]: [
        exports.SWAPS_CONTRACT_ADDRESSES[exports.ETH_CHAIN_ID],
        exports.WETH_CONTRACT_ADDRESS,
    ],
    [exports.SWAPS_TESTNET_CHAIN_ID]: [
        exports.SWAPS_CONTRACT_ADDRESSES[exports.SWAPS_TESTNET_CHAIN_ID],
        exports.WETH_CONTRACT_ADDRESS,
    ],
    [exports.BSC_CHAIN_ID]: [exports.SWAPS_CONTRACT_ADDRESSES[exports.BSC_CHAIN_ID]],
};
exports.NATIVE_SWAPS_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
const TOKEN_TRANSFER_LOG_TOPIC_HASH = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
exports.ETH_SWAPS_TOKEN_OBJECT = {
    symbol: 'ETH',
    name: 'Ether',
    address: exports.NATIVE_SWAPS_TOKEN_ADDRESS,
    decimals: 18,
};
exports.BSC_SWAPS_TOKEN_OBJECT = {
    symbol: 'BNB',
    name: 'Binance Coin',
    address: exports.NATIVE_SWAPS_TOKEN_ADDRESS,
    decimals: 18,
};
const SWAPS_NATIVE_TOKEN_OBJECTS = {
    [exports.ETH_CHAIN_ID]: exports.ETH_SWAPS_TOKEN_OBJECT,
    [exports.SWAPS_TESTNET_CHAIN_ID]: exports.ETH_SWAPS_TOKEN_OBJECT,
    [exports.BSC_CHAIN_ID]: exports.BSC_SWAPS_TOKEN_OBJECT,
};
const API_BASE_HOST_URL = {
    [exports.ETH_CHAIN_ID]: 'https://api.metaswap.codefi.network',
    [exports.SWAPS_TESTNET_CHAIN_ID]: 'https://metaswap-api.airswap-dev.codefi.network',
    [exports.BSC_CHAIN_ID]: 'https://bsc-api.metaswap.codefi.network',
};
exports.DEFAULT_ERC20_APPROVE_GAS = '0x1d4c0';
// The MAX_GAS_LIMIT is a number that is higher than the maximum gas costs we have observed on any aggregator
const MAX_GAS_LIMIT = 2500000;
var SwapsError;
(function (SwapsError) {
    SwapsError["QUOTES_EXPIRED_ERROR"] = "quotes-expired";
    SwapsError["SWAP_FAILED_ERROR"] = "swap-failed-error";
    SwapsError["ERROR_FETCHING_QUOTES"] = "error-fetching-quotes";
    SwapsError["QUOTES_NOT_AVAILABLE_ERROR"] = "quotes-not-available";
    SwapsError["OFFLINE_FOR_MAINTENANCE"] = "offline-for-maintenance";
    SwapsError["SWAPS_FETCH_ORDER_CONFLICT"] = "swaps-fetch-order-conflict";
    SwapsError["SWAPS_GAS_PRICE_ESTIMATION"] = "swaps-gas-price-estimation";
    SwapsError["SWAPS_ALLOWANCE_TIMEOUT"] = "swaps-allowance-timeout";
    SwapsError["SWAPS_ALLOWANCE_ERROR"] = "swaps-allowance-error";
})(SwapsError = exports.SwapsError || (exports.SwapsError = {}));
// Functions
function getNativeSwapsToken(chainId) {
    return SWAPS_NATIVE_TOKEN_OBJECTS[chainId];
}
exports.getNativeSwapsToken = getNativeSwapsToken;
function getSwapsContractAddress(chainId) {
    return exports.SWAPS_CONTRACT_ADDRESSES[chainId];
}
exports.getSwapsContractAddress = getSwapsContractAddress;
function isValidContractAddress(chainId, contract) {
    if (!contract) {
        return false;
    }
    return exports.ALLOWED_CONTRACT_ADDRESSES[chainId].some((allowedContract) => contract === allowedContract);
}
exports.isValidContractAddress = isValidContractAddress;
const getBaseApiURL = function (type, chainId) {
    const hostURL = API_BASE_HOST_URL[chainId];
    switch (type) {
        case swapsInterfaces_1.APIType.TRADES:
            return `${hostURL}/trades`;
        case swapsInterfaces_1.APIType.TOKENS:
            return `${hostURL}/tokens`;
        case swapsInterfaces_1.APIType.TOP_ASSETS:
            return `${hostURL}/topAssets`;
        case swapsInterfaces_1.APIType.FEATURE_FLAG:
            return `${hostURL}/featureFlag`;
        case swapsInterfaces_1.APIType.AGGREGATOR_METADATA:
            return `${hostURL}/aggregatorMetadata`;
        case swapsInterfaces_1.APIType.GAS_PRICES:
            return `${hostURL}/gasPrices`;
        default:
            throw new Error('getBaseApiURL requires an api call type');
    }
};
exports.getBaseApiURL = getBaseApiURL;
function fetchTradesInfo({ slippage, sourceToken, sourceAmount, destinationToken, walletAddress, exchangeList, }, abortSignal, chainId, clientId) {
    return __awaiter(this, void 0, void 0, function* () {
        const urlParams = {
            destinationToken,
            sourceToken,
            sourceAmount,
            slippage,
            timeout: 10000,
            walletAddress,
        };
        if (exchangeList) {
            urlParams.exchangeList = exchangeList;
        }
        if (clientId) {
            urlParams.clientId = clientId;
        }
        const tradeURL = `${exports.getBaseApiURL(swapsInterfaces_1.APIType.TRADES, chainId)}?${new URLSearchParams(urlParams).toString()}`;
        const tradesResponse = yield timeoutFetch(tradeURL, { method: 'GET', signal: abortSignal }, 15000);
        const trades = (yield tradesResponse.json());
        const newQuotes = trades.reduce((aggIdTradeMap, quote) => {
            var _a, _b;
            if (!quote.error &&
                quote.trade &&
                isValidContractAddress(chainId, (_b = (_a = quote.trade) === null || _a === void 0 ? void 0 : _a.to) === null || _b === void 0 ? void 0 : _b.toLowerCase())) {
                const constructedTrade = constructTxParams({
                    to: quote.trade.to,
                    from: quote.trade.from,
                    data: quote.trade.data,
                    amount: BNToHex(new bignumber_js_1.default(quote.trade.value)),
                    gas: BNToHex(quote.maxGas),
                });
                return Object.assign(Object.assign({}, aggIdTradeMap), { [quote.aggregator]: Object.assign(Object.assign({}, quote), { slippage, trade: constructedTrade }) });
            }
            return aggIdTradeMap;
        }, {});
        return newQuotes;
    });
}
exports.fetchTradesInfo = fetchTradesInfo;
function fetchTokens(chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenUrl = exports.getBaseApiURL(swapsInterfaces_1.APIType.TOKENS, chainId);
        const tokens = yield handleFetch(tokenUrl, { method: 'GET' });
        const filteredTokens = tokens.filter((token) => {
            return token.address !== exports.NATIVE_SWAPS_TOKEN_ADDRESS;
        });
        filteredTokens.push(getNativeSwapsToken(chainId));
        return filteredTokens;
    });
}
exports.fetchTokens = fetchTokens;
function fetchAggregatorMetadata(chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const aggregatorMetadataUrl = exports.getBaseApiURL(swapsInterfaces_1.APIType.AGGREGATOR_METADATA, chainId);
        const aggregators = yield handleFetch(aggregatorMetadataUrl, {
            method: 'GET',
        });
        return aggregators;
    });
}
exports.fetchAggregatorMetadata = fetchAggregatorMetadata;
function fetchTopAssets(chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const topAssetsUrl = exports.getBaseApiURL(swapsInterfaces_1.APIType.TOP_ASSETS, chainId);
        const response = yield handleFetch(topAssetsUrl, {
            method: 'GET',
        });
        return response;
    });
}
exports.fetchTopAssets = fetchTopAssets;
function fetchSwapsFeatureLiveness(chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const status = yield handleFetch(exports.getBaseApiURL(swapsInterfaces_1.APIType.FEATURE_FLAG, chainId), { method: 'GET' });
            return status;
        }
        catch (err) {
            return false;
        }
    });
}
exports.fetchSwapsFeatureLiveness = fetchSwapsFeatureLiveness;
function fetchGasPrices(chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = yield handleFetch(exports.getBaseApiURL(swapsInterfaces_1.APIType.GAS_PRICES, chainId), {
            method: 'GET',
        });
        return {
            safeGasPrice: new bignumber_js_1.default(SafeGasPrice).times(1000000000).toString(16),
            proposedGasPrice: new bignumber_js_1.default(ProposeGasPrice)
                .times(1000000000)
                .toString(16),
            fastGasPrice: new bignumber_js_1.default(FastGasPrice).times(1000000000).toString(16),
        };
    });
}
exports.fetchGasPrices = fetchGasPrices;
function calculateGasEstimateWithRefund(maxGas, estimatedRefund, estimatedGas) {
    const estimated = estimatedGas && ethereumjs_util_1.addHexPrefix(estimatedGas);
    const maxGasMinusRefund = new bignumber_js_1.default(maxGas || MAX_GAS_LIMIT, 10).minus(estimatedRefund || 0);
    const estimatedGasBN = new bignumber_js_1.default(estimated || '0x0');
    const gasEstimateWithRefund = maxGasMinusRefund.lt(estimatedGasBN)
        ? maxGasMinusRefund
        : estimatedGasBN;
    return gasEstimateWithRefund;
}
exports.calculateGasEstimateWithRefund = calculateGasEstimateWithRefund;
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
function getSwapsTokensReceived(receipt, approvalReceipt, transaction, approvalTransaction, destinationToken, previousBalance, postBalance) {
    if (destinationToken.address === exports.NATIVE_SWAPS_TOKEN_ADDRESS) {
        const approvalTransactionGasCost = new bignumber_js_1.default((approvalTransaction === null || approvalTransaction === void 0 ? void 0 : approvalTransaction.gasPrice) || '0x0').times((approvalReceipt === null || approvalReceipt === void 0 ? void 0 : approvalReceipt.gasUsed) || '0x0');
        const transactionGas = new bignumber_js_1.default((transaction === null || transaction === void 0 ? void 0 : transaction.gasPrice) || '0x0').times((receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) || '0x0');
        const totalGasCost = transactionGas.plus(approvalTransactionGasCost);
        const previousBalanceMinusGas = new bignumber_js_1.default(previousBalance).minus(totalGasCost);
        const postBalanceMinusGas = new bignumber_js_1.default(postBalance);
        return postBalanceMinusGas.minus(previousBalanceMinusGas).toString(16);
    }
    if (!(receipt === null || receipt === void 0 ? void 0 : receipt.logs) || receipt.status === '0x0') {
        return;
    }
    const tokenTransferLog = receipt.logs.find((receiptLog) => {
        var _a;
        const isTokenTransfer = (receiptLog === null || receiptLog === void 0 ? void 0 : receiptLog.topics[0]) === TOKEN_TRANSFER_LOG_TOPIC_HASH;
        const isTransferFromGivenToken = receiptLog.address === destinationToken.address;
        const isTransferFromGivenAddress = (_a = receiptLog === null || receiptLog === void 0 ? void 0 : receiptLog.topics[2]) === null || _a === void 0 ? void 0 : _a.match(transaction.from.slice(2));
        return (isTokenTransfer &&
            isTransferFromGivenToken &&
            isTransferFromGivenAddress);
    });
    if (!tokenTransferLog) {
        return;
    }
    return tokenTransferLog.data;
}
exports.getSwapsTokensReceived = getSwapsTokensReceived;
/**
 * Calculates the median of a sample of BigNumber values.
 *
 * @param {BigNumber[]} values - A sample of BigNumber values.
 * @returns {BigNumber} The median of the sample.
 */
function getMedian(values) {
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Expected non-empty array param.');
    }
    const sorted = [...values].sort((a, b) => a.comparedTo(b));
    if (sorted.length % 2 === 1) {
        // return middle value
        return sorted[(sorted.length - 1) / 2];
    }
    // return mean of middle two values
    const upperIndex = sorted.length / 2;
    return sorted[upperIndex].plus(sorted[upperIndex - 1]).div(2);
}
exports.getMedian = getMedian;
/**
 * Calculates the median overallValueOfQuote of a sample of quotes.
 *
 * @param {Array} quotes - A sample of quote objects with overallValueOfQuote, ethFee, metaMaskFeeInEth, and ethValueOfTokens properties
 * @returns {Object} An object with the ethValueOfTokens, ethFee, and metaMaskFeeInEth of the quote with the median overallValueOfQuote
 */
function getMedianEthValueQuote(quotes) {
    if (!Array.isArray(quotes) || quotes.length === 0) {
        throw new Error('Expected non-empty array param.');
    }
    quotes.sort((quoteA, quoteB) => {
        const overallValueOfQuoteA = new bignumber_js_1.default(quoteA.overallValueOfQuote, 10);
        const overallValueOfQuoteB = new bignumber_js_1.default(quoteB.overallValueOfQuote, 10);
        return overallValueOfQuoteA.comparedTo(overallValueOfQuoteB);
    });
    if (quotes.length % 2 === 1) {
        // return middle values
        const medianOverallValue = quotes[(quotes.length - 1) / 2].overallValueOfQuote;
        const quotesMatchingMedianQuoteValue = quotes.filter((quote) => medianOverallValue === quote.overallValueOfQuote);
        return meansOfQuotesFeesAndValue(quotesMatchingMedianQuoteValue);
    }
    // return mean of middle two values
    const upperIndex = quotes.length / 2;
    const lowerIndex = upperIndex - 1;
    const overallValueAtUpperIndex = quotes[upperIndex].overallValueOfQuote;
    const overallValueAtLowerIndex = quotes[lowerIndex].overallValueOfQuote;
    const quotesMatchingUpperIndexValue = quotes.filter((quote) => overallValueAtUpperIndex === quote.overallValueOfQuote);
    const quotesMatchingLowerIndexValue = quotes.filter((quote) => overallValueAtLowerIndex === quote.overallValueOfQuote);
    const feesAndValueAtUpperIndex = meansOfQuotesFeesAndValue(quotesMatchingUpperIndexValue);
    const feesAndValueAtLowerIndex = meansOfQuotesFeesAndValue(quotesMatchingLowerIndexValue);
    return {
        ethFee: new bignumber_js_1.default(feesAndValueAtUpperIndex.ethFee, 10)
            .plus(feesAndValueAtLowerIndex.ethFee, 10)
            .dividedBy(2)
            .toString(10),
        metaMaskFeeInEth: new bignumber_js_1.default(feesAndValueAtUpperIndex.metaMaskFeeInEth, 10)
            .plus(feesAndValueAtLowerIndex.metaMaskFeeInEth, 10)
            .dividedBy(2)
            .toString(10),
        ethValueOfTokens: new bignumber_js_1.default(feesAndValueAtUpperIndex.ethValueOfTokens, 10)
            .plus(feesAndValueAtLowerIndex.ethValueOfTokens, 10)
            .dividedBy(2)
            .toString(10),
    };
}
exports.getMedianEthValueQuote = getMedianEthValueQuote;
/**
 * Calculates the arithmetic mean for each of three properties - ethFee, metaMaskFeeInEth and ethValueOfTokens - across
 * an array of objects containing those properties.
 *
 * @param {Array} quotes - A sample of quote objects with overallValueOfQuote, ethFee, metaMaskFeeInEth and
 * ethValueOfTokens properties
 * @returns {Object} An object with the arithmetic mean each of the ethFee, metaMaskFeeInEth and ethValueOfTokens of
 * the passed quote objects
 */
function meansOfQuotesFeesAndValue(quotes) {
    const feeAndValueSumsAsBigNumbers = quotes.reduce((feeAndValueSums, quote) => ({
        ethFee: feeAndValueSums.ethFee.plus(quote.ethFee, 10),
        metaMaskFeeInEth: feeAndValueSums.metaMaskFeeInEth.plus(quote.metaMaskFeeInEth, 10),
        ethValueOfTokens: feeAndValueSums.ethValueOfTokens.plus(quote.ethValueOfTokens, 10),
    }), {
        ethFee: new bignumber_js_1.default(0, 10),
        metaMaskFeeInEth: new bignumber_js_1.default(0, 10),
        ethValueOfTokens: new bignumber_js_1.default(0, 10),
    });
    return {
        ethFee: feeAndValueSumsAsBigNumbers.ethFee
            .div(quotes.length, 10)
            .toString(10),
        metaMaskFeeInEth: feeAndValueSumsAsBigNumbers.metaMaskFeeInEth
            .div(quotes.length, 10)
            .toString(10),
        ethValueOfTokens: feeAndValueSumsAsBigNumbers.ethValueOfTokens
            .div(quotes.length, 10)
            .toString(10),
    };
}
function calculateGasLimits(approvalNeeded, gasEstimateWithRefund, gasEstimate, averageGas, maxGas, gasMultiplier, gasLimit) {
    let tradeGasLimit, tradeMaxGasLimit;
    const customGasLimit = gasLimit && new bignumber_js_1.default(gasLimit, 16);
    if (!approvalNeeded &&
        gasEstimate &&
        gasEstimateWithRefund &&
        gasEstimateWithRefund !== '0') {
        tradeGasLimit = new bignumber_js_1.default(gasEstimateWithRefund, 16);
        tradeMaxGasLimit =
            customGasLimit ||
                new bignumber_js_1.default(gasEstimate).times(gasMultiplier).integerValue();
    }
    else {
        tradeGasLimit = new bignumber_js_1.default(averageGas || MAX_GAS_LIMIT, 10);
        tradeMaxGasLimit =
            customGasLimit || new bignumber_js_1.default(maxGas || MAX_GAS_LIMIT, 10);
    }
    return { tradeGasLimit, tradeMaxGasLimit };
}
exports.calculateGasLimits = calculateGasLimits;
function calcTokenAmount(value, decimals) {
    const multiplier = Math.pow(10, Number(decimals || 0));
    return new bignumber_js_1.default(value).div(multiplier);
}
exports.calcTokenAmount = calcTokenAmount;
/**
 * Estimates required gas for a given transaction
 *
 * @param transaction - Transaction object to estimate gas for
 * @returns - Promise resolving to an object containing gas and gasPrice
 */
function estimateGas(transaction, ethQuery) {
    return __awaiter(this, void 0, void 0, function* () {
        const estimatedTransaction = Object.assign({}, transaction);
        const { value, data } = estimatedTransaction;
        const { gasLimit } = yield query(ethQuery, 'getBlockByNumber', [
            'latest',
            false,
        ]);
        estimatedTransaction.data = !data
            ? data
            : /* istanbul ignore next */ ethereumjs_util_1.addHexPrefix(data);
        // 3. If this is a contract address, safely estimate gas using RPC
        estimatedTransaction.value =
            typeof value === 'undefined' ? '0x0' : /* istanbul ignore next */ value;
        const gasHex = yield query(ethQuery, 'estimateGas', [estimatedTransaction]);
        return { blockGasLimit: gasLimit, gas: ethereumjs_util_1.addHexPrefix(gasHex) };
    });
}
exports.estimateGas = estimateGas;
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
function constructTxParams({ sendToken, data, to, amount, from, gas, gasPrice, }) {
    const txParams = {
        data,
        from,
        value: '0',
        gas,
        gasPrice,
    };
    if (!sendToken) {
        txParams.value = amount;
        txParams.to = to;
    }
    return normalizeTransaction(txParams);
}
exports.constructTxParams = constructTxParams;
//# sourceMappingURL=swapsUtil.js.map