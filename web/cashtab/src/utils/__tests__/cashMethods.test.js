import BigNumber from 'bignumber.js';
import {
    fromSatoshisToXec,
    flattenContactList,
    loadStoredWallet,
    isValidStoredWallet,
    fromLegacyDecimals,
    convertToEcashPrefix,
    isLegacyMigrationRequired,
    toLegacyCash,
    toLegacyToken,
    toLegacyCashArray,
    convertEtokenToEcashAddr,
    parseOpReturn,
    convertEcashtoEtokenAddr,
    getHashArrayFromWallet,
    isActiveWebsocket,
    parseXecSendValue,
    getChangeAddressFromInputUtxos,
    generateOpReturnScript,
    generateTxInput,
    generateTxOutput,
    generateTokenTxInput,
    signAndBuildTx,
    fromXecToSatoshis,
    getWalletBalanceFromUtxos,
    signUtxosByAddress,
    getUtxoWif,
    generateTokenTxOutput,
    getCashtabByteCount,
    calcFee,
    toHash160,
    generateGenesisOpReturn,
    generateSendOpReturn,
    generateBurnOpReturn,
    getECPairFromWIF,
} from 'utils/cashMethods';
import { currency } from 'components/Common/Ticker';
import {
    validAddressArrayInput,
    validAddressArrayInputMixedPrefixes,
    validAddressArrayOutput,
    validLargeAddressArrayInput,
    validLargeAddressArrayOutput,
    invalidAddressArrayInput,
} from '../__mocks__/mockAddressArray';
import {
    mockGenesisOpReturnScript,
    mockSendOpReturnScript,
    mockSendOpReturnTokenUtxos,
    mockBurnOpReturnScript,
    mockBurnOpReturnTokenUtxos,
} from '../__mocks__/mockOpReturnScript';
import {
    cachedUtxos,
    utxosLoadedFromCache,
} from '../__mocks__/mockCachedUtxos';
import {
    validStoredWallet,
    invalidStoredWallet,
    invalidpreChronikStoredWallet,
} from '../__mocks__/mockStoredWallets';

import {
    missingPath1899Wallet,
    missingPublicKeyInPath1899Wallet,
    missingPublicKeyInPath145Wallet,
    missingPublicKeyInPath245Wallet,
    notLegacyWallet,
    missingHash160,
} from '../__mocks__/mockLegacyWalletsUtils';

import {
    shortCashtabMessageInputHex,
    longCashtabMessageInputHex,
    shortExternalMessageInputHex,
    longExternalMessageInputHex,
    shortSegmentedExternalMessageInputHex,
    longSegmentedExternalMessageInputHex,
    mixedSegmentedExternalMessageInputHex,
    mockParsedShortCashtabMessageArray,
    mockParsedLongCashtabMessageArray,
    mockParsedShortExternalMessageArray,
    mockParsedLongExternalMessageArray,
    mockParsedShortSegmentedExternalMessageArray,
    mockParsedLongSegmentedExternalMessageArray,
    mockParsedMixedSegmentedExternalMessageArray,
    eTokenInputHex,
    mockParsedETokenOutputArray,
    mockAirdropHexOutput,
    mockParsedAirdropMessageArray,
} from '../__mocks__/mockOpReturnParsedArray';

import mockLegacyWallets from 'hooks/__mocks__/mockLegacyWallets';
import BCHJS from '@psf/bch-js';
import sendBCHMock from '../../hooks/__mocks__/sendBCH';
import {
    activeWebsocketAlpha,
    disconnectedWebsocketAlpha,
    unsubscribedWebsocket,
} from '../__mocks__/chronikWs';
import mockNonSlpUtxos from '../../hooks/__mocks__/mockNonSlpUtxos';
import mockSlpUtxos from '../../hooks/__mocks__/mockSlpUtxos';
import {
    mockOneToOneSendXecTxBuilderObj,
    mockOneToManySendXecTxBuilderObj,
    mockCreateTokenOutputsTxBuilderObj,
    mockSendTokenOutputsTxBuilderObj,
    mockBurnTokenOutputsTxBuilderObj,
    mockCreateTokenTxBuilderObj,
    mockSendTokenTxBuilderObj,
    mockBurnTokenTxBuilderObj,
} from '../__mocks__/mockTxBuilderObj';
import {
    mockSingleInputUtxo,
    mockMultipleInputUtxos,
    mockSingleOutput,
    mockMultipleOutputs,
} from '../__mocks__/mockTxBuilderData';
import createTokenMock from '../../hooks/__mocks__/createToken';
import TransactionBuilder from 'utils/txBuilder';
import { mockWif, mockStringifiedECPair } from '../__mocks__/mockECPair';

it(`generateSendOpReturn() returns correct script object for valid tokenUtxo and send quantity`, () => {
    const BCH = new BCHJS();
    const tokensToSend = 50;
    const sendOpReturnScriptObj = generateSendOpReturn(
        mockSendOpReturnTokenUtxos,
        tokensToSend,
    );
    const legacySendOpReturnScriptObj = BCH.SLP.TokenType1.generateSendOpReturn(
        mockSendOpReturnTokenUtxos,
        tokensToSend.toString(),
    );

    expect(JSON.stringify(sendOpReturnScriptObj.script)).toStrictEqual(
        JSON.stringify(mockSendOpReturnScript),
    );
    expect(JSON.stringify(sendOpReturnScriptObj.script)).toStrictEqual(
        JSON.stringify(legacySendOpReturnScriptObj.script),
    );
});

it(`generateSendOpReturnScript() throws error on invalid input`, () => {
    const BCH = new BCHJS();
    const mockSendOpReturnTokenUtxos = null;
    const tokensToSend = 50;

    let errorThrown;
    try {
        generateSendOpReturn(mockSendOpReturnTokenUtxos, tokensToSend);
    } catch (err) {
        errorThrown = err.message;
    }
    expect(errorThrown).toStrictEqual('Invalid send token parameter');
});

it(`generateBurnOpReturn() returns correct script for valid tokenUtxo and burn quantity`, () => {
    const BCH = new BCHJS();
    const tokensToBurn = 7000;
    const burnOpReturnScript = generateBurnOpReturn(
        mockBurnOpReturnTokenUtxos,
        tokensToBurn,
    );
    const legacyBurnOpReturnScript = BCH.SLP.TokenType1.generateBurnOpReturn(
        mockBurnOpReturnTokenUtxos,
        tokensToBurn,
    );
    expect(JSON.stringify(burnOpReturnScript)).toStrictEqual(
        JSON.stringify(mockBurnOpReturnScript),
    );
    expect(JSON.stringify(burnOpReturnScript)).toStrictEqual(
        JSON.stringify(legacyBurnOpReturnScript),
    );
});

it(`generateBurnOpReturn() throws error on invalid input`, () => {
    const tokensToBurn = 7000;
    let errorThrown;
    try {
        generateBurnOpReturn(null, tokensToBurn);
    } catch (err) {
        errorThrown = err.message;
    }
    expect(errorThrown).toStrictEqual('Invalid burn token parameter');
});

it(`generateGenesisOpReturn() returns correct script for a valid configObj`, () => {
    const BCH = new BCHJS();
    const configObj = {
        name: 'ethantest',
        ticker: 'ETN',
        documentUrl: 'https://cashtab.com/',
        decimals: '3',
        initialQty: '5000',
        documentHash: '',
        mintBatonVout: null,
    };

    const genesisOpReturnScript = generateGenesisOpReturn(configObj);
    const legacyGenesisOpReturnScript =
        BCH.SLP.TokenType1.generateGenesisOpReturn(configObj);

    expect(JSON.stringify(genesisOpReturnScript)).toStrictEqual(
        JSON.stringify(mockGenesisOpReturnScript),
    );

    expect(JSON.stringify(genesisOpReturnScript)).toStrictEqual(
        JSON.stringify(legacyGenesisOpReturnScript),
    );
});

it(`generateGenesisOpReturn() throws error on invalid configObj`, () => {
    const BCH = new BCHJS();
    const configObj = null;

    let errorThrown;
    try {
        generateGenesisOpReturn(configObj);
    } catch (err) {
        errorThrown = err.message;
    }
    expect(errorThrown).toStrictEqual('Invalid token configuration');
});

it(`signUtxosByAddress() successfully returns a txBuilder object for a one to one XEC tx`, () => {
    const BCH = new BCHJS();
    const isOneToMany = false;
    const { destinationAddress, wallet, utxos } = sendBCHMock;
    let txBuilder = new TransactionBuilder();
    const satoshisToSendInput = new BigNumber(2184);
    const feeInSatsPerByte = currency.defaultFee;

    // mock tx input
    const inputObj = generateTxInput(
        BCH,
        isOneToMany,
        utxos,
        txBuilder,
        null,
        satoshisToSendInput,
        feeInSatsPerByte,
    );

    // mock tx output
    const totalInputUtxoValue =
        mockOneToOneSendXecTxBuilderObj.transaction.inputs[0].value;
    const singleSendValue = new BigNumber(
        fromSatoshisToXec(
            mockOneToOneSendXecTxBuilderObj.transaction.tx.outs[0].value,
        ),
    );
    const satoshisToSendOutput = fromXecToSatoshis(
        new BigNumber(singleSendValue),
    );
    const txFee = new BigNumber(totalInputUtxoValue).minus(
        new BigNumber(satoshisToSendOutput),
    );
    const changeAddress = wallet.Path1899.cashAddress;
    const outputObj = generateTxOutput(
        BCH,
        isOneToMany,
        singleSendValue,
        satoshisToSendOutput,
        totalInputUtxoValue,
        destinationAddress,
        null,
        changeAddress,
        txFee,
        inputObj.txBuilder,
    );

    const txBuilderResponse = signUtxosByAddress(
        mockSingleInputUtxo,
        wallet,
        outputObj,
    );
    expect(txBuilderResponse.toString()).toStrictEqual(
        mockOneToOneSendXecTxBuilderObj.toString(),
    );
});

it(`signUtxosByAddress() successfully returns a txBuilder object for a one to many XEC tx`, () => {
    const BCH = new BCHJS();
    const isOneToMany = true;
    const { wallet, utxos } = sendBCHMock;
    let txBuilder = new TransactionBuilder();
    let destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,3000',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,3000',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3000',
    ];
    const satoshisToSendInput = new BigNumber(900000);
    const feeInSatsPerByte = currency.defaultFee;

    // mock tx input
    const inputObj = generateTxInput(
        BCH,
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSendInput,
        feeInSatsPerByte,
    );

    // mock tx output
    const totalInputUtxoValue =
        mockOneToManySendXecTxBuilderObj.transaction.inputs[0].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[1].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[2].value;
    const singleSendValue = null;
    const satoshisToSendOutput = new BigNumber(
        mockOneToManySendXecTxBuilderObj.transaction.tx.outs[0].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[1].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[2].value,
    );
    const txFee = new BigNumber(totalInputUtxoValue)
        .minus(satoshisToSendOutput)
        .minus(
            new BigNumber(
                mockOneToManySendXecTxBuilderObj.transaction.tx.outs[3].value,
            ),
        ); // change value
    destinationAddressAndValueArray = toLegacyCashArray(validAddressArrayInput);
    const changeAddress = wallet.Path1899.cashAddress;
    const outputObj = generateTxOutput(
        BCH,
        isOneToMany,
        singleSendValue,
        satoshisToSendOutput,
        totalInputUtxoValue,
        null,
        destinationAddressAndValueArray,
        changeAddress,
        txFee,
        inputObj.txBuilder,
    );

    const txBuilderResponse = signUtxosByAddress(
        mockSingleInputUtxo,
        wallet,
        outputObj,
    );
    expect(txBuilderResponse.toString()).toStrictEqual(
        mockOneToManySendXecTxBuilderObj.toString(),
    );
});

it(`getChangeAddressFromInputUtxos() returns a correct change address from a valid inputUtxo`, () => {
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const inputUtxo = [
        {
            height: 669639,
            tx_hash:
                '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            tx_pos: 0,
            value: 1000,
            txid: '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            vout: 0,
            isValid: false,
            address: 'bitcoincash:qphpmfj0qn7znklqhrfn5dq7qh36l3vxavu346vqcl',
            wif: 'L58jqHoi5ynSdsskPVBJuGuVqTP8ZML1MwHQsBJY32Pv7cqDSCeH',
        },
    ];

    const changeAddress = getChangeAddressFromInputUtxos(
        BCH,
        inputUtxo,
        wallet,
    );
    expect(changeAddress).toStrictEqual(inputUtxo[0].address);
});

it(`getChangeAddressFromInputUtxos() throws error upon a malformed input utxo`, () => {
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const invalidInputUtxo = [
        {
            height: 669639,
            tx_hash:
                '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            tx_pos: 0,
            value: 1000,
            txid: '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            vout: 0,
            isValid: false,
            wif: 'L58jqHoi5ynSdsskPVBJuGuVqTP8ZML1MwHQsBJY32Pv7cqDSCeH',
        },
    ];
    let thrownError;
    try {
        getChangeAddressFromInputUtxos(BCH, invalidInputUtxo, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid input utxo');
});

it(`getChangeAddressFromInputUtxos() throws error upon a valid input utxo with invalid address param`, () => {
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const invalidInputUtxo = [
        {
            height: 669639,
            tx_hash:
                '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            tx_pos: 0,
            value: 1000,
            address: 'bitcoincash:1qphpmfj0qn7znklqhrfn5dq7qh36l3vxavu346vqcl', // invalid cash address
            txid: '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            vout: 0,
            isValid: false,
            wif: 'L58jqHoi5ynSdsskPVBJuGuVqTP8ZML1MwHQsBJY32Pv7cqDSCeH',
        },
    ];
    let thrownError;
    try {
        getChangeAddressFromInputUtxos(BCH, invalidInputUtxo, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid input utxo');
});

it(`getChangeAddressFromInputUtxos() throws an error upon a null inputUtxos param`, () => {
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const inputUtxo = null;

    let thrownError;
    try {
        getChangeAddressFromInputUtxos(BCH, inputUtxo, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual(
        'Invalid getChangeAddressFromWallet input parameter',
    );
});

it(`parseXecSendValue() correctly parses the value for a valid one to one send XEC transaction`, () => {
    expect(parseXecSendValue(false, '550', null)).toStrictEqual(
        new BigNumber(550),
    );
});

it(`parseXecSendValue() correctly parses the value for a valid one to many send XEC transaction`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,6',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,6',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,6',
    ];
    expect(
        parseXecSendValue(true, null, destinationAddressAndValueArray),
    ).toStrictEqual(new BigNumber(18));
});

it(`parseXecSendValue() correctly throws error when singleSendValue is invalid for a one to one send XEC transaction`, () => {
    let errorThrown;
    try {
        parseXecSendValue(false, null, 550);
    } catch (err) {
        errorThrown = err;
    }
    expect(errorThrown.message).toStrictEqual('Invalid singleSendValue');
});

it(`parseXecSendValue() correctly throws error when destinationAddressAndValueArray is invalid for a one to many send XEC transaction`, () => {
    let errorThrown;
    try {
        parseXecSendValue(true, null, null);
    } catch (err) {
        errorThrown = err;
    }
    expect(errorThrown.message).toStrictEqual(
        'Invalid destinationAddressAndValueArray',
    );
});

it(`parseXecSendValue() correctly throws error when the total value for a one to one send XEC transaction is below dust`, () => {
    let errorThrown;
    try {
        parseXecSendValue(false, '4.5', null);
    } catch (err) {
        errorThrown = err;
    }
    expect(errorThrown.message).toStrictEqual('dust');
});

it(`parseXecSendValue() correctly throws error when the total value for a one to many send XEC transaction is below dust`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,2',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,2',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,1',
    ];
    let errorThrown;
    try {
        parseXecSendValue(true, null, destinationAddressAndValueArray);
    } catch (err) {
        errorThrown = err;
    }
    expect(errorThrown.message).toStrictEqual('dust');
});

it('generateOpReturnScript() correctly generates an encrypted message script', () => {
    const optionalOpReturnMsg = 'testing generateOpReturnScript()';
    const encryptionFlag = true;
    const airdropFlag = false;
    const airdropTokenId = null;
    const mockEncryptedEj =
        '04688f9907fe3c7c0b78a73c4ab4f75e15e7e2b79641add519617086126fe6f6b1405a14eed48e90c9c8c0fc77f0f36984a78173e76ce51f0a44af94b59e9da703c9ff82758cfdb9cc46437d662423400fb731d3bfc1df0599279356ca261213fbb40d398c041e1bac966afed1b404581ab1bcfcde1fa039d53b7c7b70e8edf26d64bea9fbeed24cc80909796e6af5863707fa021f2a2ebaa2fe894904702be19d';

    const encodedScript = generateOpReturnScript(
        optionalOpReturnMsg,
        encryptionFlag,
        airdropFlag,
        airdropTokenId,
        mockEncryptedEj,
    );
    expect(encodedScript.toString('hex')).toBe(
        '6a04657461624d420130343638386639393037666533633763306237386137336334616234663735653135653765326237393634316164643531393631373038363132366665366636623134303561313465656434386539306339633863306663373766306633363938346137383137336537366365353166306134346166393462353965396461373033633966663832373538636664623963633436343337643636323432333430306662373331643362666331646630353939323739333536636132363132313366626234306433393863303431653162616339363661666564316234303435383161623162636663646531666130333964353362376337623730653865646632366436346265613966626565643234636338303930393739366536616635383633373037666130323166326132656261613266653839343930343730326265313964',
    );
});

it('generateOpReturnScript() correctly generates an un-encrypted non-airdrop message script', () => {
    const optionalOpReturnMsg = 'testing generateOpReturnScript()';
    const encryptionFlag = false;
    const airdropFlag = false;

    const encodedScript = generateOpReturnScript(
        optionalOpReturnMsg,
        encryptionFlag,
        airdropFlag,
    );
    expect(encodedScript.toString('hex')).toBe(
        '6a04007461622074657374696e672067656e65726174654f7052657475726e5363726970742829',
    );
});

it('generateOpReturnScript() correctly generates an un-encrypted airdrop message script', () => {
    const optionalOpReturnMsg = 'testing generateOpReturnScript()';
    const encryptionFlag = false;
    const airdropFlag = true;
    const airdropTokenId =
        '1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e';

    const encodedScript = generateOpReturnScript(
        optionalOpReturnMsg,
        encryptionFlag,
        airdropFlag,
        airdropTokenId,
    );
    expect(encodedScript.toString('hex')).toBe(
        '6a0464726f70201c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e04007461622074657374696e672067656e65726174654f7052657475726e5363726970742829',
    );
});

it('generateOpReturnScript() correctly generates an un-encrypted airdrop with no message script', () => {
    const optionalOpReturnMsg = null;
    const encryptionFlag = false;
    const airdropFlag = true;
    const airdropTokenId =
        '1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e';

    const encodedScript = generateOpReturnScript(
        optionalOpReturnMsg,
        encryptionFlag,
        airdropFlag,
        airdropTokenId,
    );
    expect(encodedScript.toString('hex')).toBe(
        '6a0464726f70201c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e0400746162',
    );
});

it('generateOpReturnScript() correctly throws an error on an invalid encryption input', () => {
    const optionalOpReturnMsg = null;
    const encryptionFlag = true;
    const airdropFlag = false;
    const airdropTokenId = null;
    const mockEncryptedEj = null; // invalid given encryptionFlag is true
    let thrownError;

    try {
        generateOpReturnScript(
            optionalOpReturnMsg,
            encryptionFlag,
            airdropFlag,
            airdropTokenId,
            mockEncryptedEj,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid OP RETURN script input');
});

it('generateOpReturnScript() correctly throws an error on an invalid airdrop input', () => {
    const optionalOpReturnMsg = null;
    const encryptionFlag = false;
    const airdropFlag = true;
    const airdropTokenId = null; // invalid given airdropFlag is true

    let thrownError;

    try {
        generateOpReturnScript(
            optionalOpReturnMsg,
            encryptionFlag,
            airdropFlag,
            airdropTokenId,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid OP RETURN script input');
});

it(`generateTokenTxInput() returns a valid object for a valid create token tx`, async () => {
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const tokenId =
        '1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e';
    const tokenInputObj = generateTokenTxInput(
        BCH,
        'GENESIS',
        mockNonSlpUtxos,
        null, // no slpUtxos used for genesis tx
        tokenId,
        null, // no token send/burn amount for genesis tx
        currency.defaultFee,
        txBuilder,
    );

    expect(tokenInputObj.inputXecUtxos).toStrictEqual(
        [mockNonSlpUtxos[0]].concat([mockNonSlpUtxos[1]]),
    );
    expect(tokenInputObj.txBuilder.toString()).toStrictEqual(
        mockCreateTokenTxBuilderObj.toString(),
    );
    expect(tokenInputObj.remainderXecValue).toStrictEqual(
        new BigNumber(699702), // remainder = tokenInputObj.inputXecUtxos - currency.etokenSats - txFee
    );
});

it(`generateTokenTxInput() returns a valid object for a valid send token tx`, async () => {
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const tokenId = mockSlpUtxos[0].tokenId;

    const tokenInputObj = generateTokenTxInput(
        BCH,
        'SEND',
        mockNonSlpUtxos,
        mockSlpUtxos,
        tokenId,
        new BigNumber(500), // sending 500 of these tokens
        currency.defaultFee,
        txBuilder,
    );

    expect(tokenInputObj.inputTokenUtxos).toStrictEqual(
        [mockSlpUtxos[0]].concat([mockSlpUtxos[1]]), // mockSlpUtxos[0] 400 + mockSlpUtxos[1] 6500
    );
    expect(tokenInputObj.remainderTokenValue).toStrictEqual(
        new BigNumber(6400), // token change is mockSlpUtxos[0] 400 + mockSlpUtxos[1] 6500 - [tokenAmount] 500
    );
    expect(tokenInputObj.txBuilder.toString()).toStrictEqual(
        mockSendTokenTxBuilderObj.toString(),
    );
});

it(`generateTokenTxInput() returns a valid object for a valid burn token tx`, async () => {
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const tokenId = mockSlpUtxos[0].tokenId;

    const tokenInputObj = generateTokenTxInput(
        BCH,
        'BURN',
        mockNonSlpUtxos,
        mockSlpUtxos,
        tokenId,
        new BigNumber(500), // burning 500 of these tokens
        currency.defaultFee,
        txBuilder,
    );

    expect(tokenInputObj.inputTokenUtxos).toStrictEqual(
        [mockSlpUtxos[0]].concat([mockSlpUtxos[1]]), // mockSlpUtxos[0] 400 + mockSlpUtxos[1] 6500
    );
    expect(tokenInputObj.remainderTokenValue).toStrictEqual(
        new BigNumber(6400), // token change is mockSlpUtxos[0] 400 + mockSlpUtxos[1] 6500 - [tokenAmount] 500
    );
    expect(tokenInputObj.txBuilder.toString()).toStrictEqual(
        mockBurnTokenTxBuilderObj.toString(),
    );
});

it(`generateTokenTxOutput() returns a valid object for a valid create token tx`, async () => {
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const { configObj, wallet } = createTokenMock;
    const tokenSenderCashAddress = wallet.Path1899.cashAddress;

    const tokenOutputObj = generateTokenTxOutput(
        BCH,
        txBuilder,
        'GENESIS',
        tokenSenderCashAddress,
        null, // optional, for SEND or BURN amount
        new BigNumber(500), // remainder XEC value
        configObj,
    );

    expect(tokenOutputObj.toString()).toStrictEqual(
        mockCreateTokenOutputsTxBuilderObj.toString(),
    );
});

it(`generateTokenTxOutput() returns a valid object for a valid send token tx`, async () => {
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const { wallet } = createTokenMock;
    const tokenSenderCashAddress = wallet.Path1899.cashAddress;
    const tokenRecipientTokenAddress = wallet.Path1899.slpAddress;

    const tokenOutputObj = generateTokenTxOutput(
        BCH,
        txBuilder,
        'SEND',
        tokenSenderCashAddress,
        mockSlpUtxos,
        new BigNumber(500), // remainder XEC value
        null, // only for genesis tx
        tokenRecipientTokenAddress, // recipient token address
        new BigNumber(50),
    );

    expect(tokenOutputObj.toString()).toStrictEqual(
        mockSendTokenOutputsTxBuilderObj.toString(),
    );
});

it(`generateTokenTxOutput() returns a valid object for a valid burn token tx`, async () => {
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const { wallet } = createTokenMock;
    const tokenSenderCashAddress = wallet.Path1899.cashAddress;

    const tokenOutputObj = generateTokenTxOutput(
        BCH,
        txBuilder,
        'BURN',
        tokenSenderCashAddress,
        mockSlpUtxos,
        new BigNumber(500), // remainder XEC value
        null, // only for genesis tx
        null, // no token recipients for burn tx
        new BigNumber(50),
    );

    expect(tokenOutputObj.toString()).toStrictEqual(
        mockBurnTokenOutputsTxBuilderObj.toString(),
    );
});

it(`generateTxInput() returns an input object for a valid one to one XEC tx`, async () => {
    const BCH = new BCHJS();
    const isOneToMany = false;
    const utxos = mockNonSlpUtxos;
    let txBuilder = new TransactionBuilder();
    const destinationAddressAndValueArray = null;
    const satoshisToSend = new BigNumber(2184);
    const feeInSatsPerByte = currency.defaultFee;

    const inputObj = generateTxInput(
        BCH,
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSend,
        feeInSatsPerByte,
    );
    expect(inputObj.txBuilder).not.toStrictEqual(null);
    expect(inputObj.totalInputUtxoValue).toStrictEqual(new BigNumber(701000));
    expect(inputObj.txFee).toStrictEqual(752);
    expect(inputObj.inputUtxos.length).not.toStrictEqual(0);
});

it(`generateTxInput() returns an input object for a valid one to many XEC tx`, async () => {
    const BCH = new BCHJS();
    const isOneToMany = true;
    const utxos = mockNonSlpUtxos;
    let txBuilder = new TransactionBuilder();
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,3000',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,3000',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3000',
    ];
    const satoshisToSend = new BigNumber(900000);
    const feeInSatsPerByte = currency.defaultFee;

    const inputObj = generateTxInput(
        BCH,
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSend,
        feeInSatsPerByte,
    );
    expect(inputObj.txBuilder).not.toStrictEqual(null);
    expect(inputObj.totalInputUtxoValue).toStrictEqual(new BigNumber(1401000));
    expect(inputObj.txFee).toStrictEqual(1186);
    expect(inputObj.inputUtxos.length).not.toStrictEqual(0);
});

it(`generateTxInput() throws error for a one to many XEC tx with invalid destinationAddressAndValueArray input`, async () => {
    const BCH = new BCHJS();
    const isOneToMany = true;
    const utxos = mockNonSlpUtxos;
    let txBuilder = new TransactionBuilder();
    const destinationAddressAndValueArray = null; // invalid since isOneToMany is true
    const satoshisToSend = new BigNumber(900000);
    const feeInSatsPerByte = currency.defaultFee;

    let thrownError;
    try {
        generateTxInput(
            BCH,
            isOneToMany,
            utxos,
            txBuilder,
            destinationAddressAndValueArray,
            satoshisToSend,
            feeInSatsPerByte,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid tx input parameter');
});

it(`generateTxInput() throws error for a one to many XEC tx with invalid utxos input`, async () => {
    const BCH = new BCHJS();
    const isOneToMany = true;
    const utxos = null;
    let txBuilder = new TransactionBuilder();
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,3000',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,3000',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3000',
    ];
    const satoshisToSend = new BigNumber(900000);
    const feeInSatsPerByte = currency.defaultFee;

    let thrownError;
    try {
        generateTxInput(
            BCH,
            isOneToMany,
            utxos,
            txBuilder,
            destinationAddressAndValueArray,
            satoshisToSend,
            feeInSatsPerByte,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid tx input parameter');
});

it(`generateTxOutput() returns a txBuilder instance for a valid one to one XEC tx`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    const { destinationAddress, wallet } = sendBCHMock;
    const isOneToMany = false;
    const singleSendValue = fromSatoshisToXec(
        mockOneToOneSendXecTxBuilderObj.transaction.tx.outs[0].value,
    );
    const totalInputUtxoValue =
        mockOneToOneSendXecTxBuilderObj.transaction.inputs[0].value;
    const satoshisToSend = fromXecToSatoshis(new BigNumber(singleSendValue));
    // for unit test purposes, calculate fee by subtracting satoshisToSend from totalInputUtxoValue
    // no change output to be subtracted in this tx
    const txFee = new BigNumber(totalInputUtxoValue).minus(
        new BigNumber(satoshisToSend),
    );

    const destinationAddressAndValueArray = null;
    let txBuilder = new TransactionBuilder();
    const changeAddress = wallet.Path1899.cashAddress;

    const outputObj = generateTxOutput(
        BCH,
        isOneToMany,
        singleSendValue,
        satoshisToSend,
        totalInputUtxoValue,
        destinationAddress,
        destinationAddressAndValueArray,
        changeAddress,
        txFee,
        txBuilder,
    );
    expect(outputObj.toString()).toStrictEqual(
        mockOneToOneSendXecTxBuilderObj.toString(),
    );
});

it(`generateTxOutput() returns a txBuilder instance for a valid one to many XEC tx`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    const { destinationAddress, wallet } = sendBCHMock;
    const isOneToMany = true;
    const singleSendValue = null;
    const totalInputUtxoValue =
        mockOneToManySendXecTxBuilderObj.transaction.inputs[0].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[1].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[2].value;
    const satoshisToSend = new BigNumber(
        mockOneToManySendXecTxBuilderObj.transaction.tx.outs[0].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[1].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[2].value,
    );
    // for unit test purposes, calculate fee by subtracting satoshisToSend and change amount from totalInputUtxoValue
    const txFee = new BigNumber(totalInputUtxoValue)
        .minus(satoshisToSend)
        .minus(
            new BigNumber(
                mockOneToManySendXecTxBuilderObj.transaction.tx.outs[3].value,
            ),
        ); // change value

    const destinationAddressAndValueArray = toLegacyCashArray(
        validAddressArrayInput,
    );
    let txBuilder = new TransactionBuilder();
    const changeAddress = wallet.Path1899.cashAddress;

    const outputObj = generateTxOutput(
        BCH,
        isOneToMany,
        singleSendValue,
        satoshisToSend,
        totalInputUtxoValue,
        destinationAddress,
        destinationAddressAndValueArray,
        changeAddress,
        txFee,
        txBuilder,
    );
    expect(outputObj.toString()).toStrictEqual(
        mockOneToManySendXecTxBuilderObj.toString(),
    );
});

it(`generateTxOutput() throws an error on invalid input params for a one to one XEC tx`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const isOneToMany = false;
    const singleSendValue = null; // invalid due to singleSendValue being mandatory when isOneToMany is false
    const totalInputUtxoValue =
        mockOneToOneSendXecTxBuilderObj.transaction.inputs[0].value;
    const satoshisToSend = fromXecToSatoshis(new BigNumber(singleSendValue));
    // for unit test purposes, calculate fee by subtracting satoshisToSend from totalInputUtxoValue
    // no change output to be subtracted in this tx
    const txFee = new BigNumber(totalInputUtxoValue).minus(satoshisToSend);

    const destinationAddressAndValueArray = null;
    let txBuilder = new TransactionBuilder();
    const changeAddress = wallet.Path1899.cashAddress;

    let thrownError;
    try {
        generateTxOutput(
            BCH,
            isOneToMany,
            singleSendValue,
            satoshisToSend,
            totalInputUtxoValue,
            null,
            destinationAddressAndValueArray,
            changeAddress,
            txFee,
            txBuilder,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid tx input parameter');
});

it(`generateTxOutput() throws an error on invalid input params for a one to many XEC tx`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const isOneToMany = true;
    const singleSendValue = null;
    const totalInputUtxoValue =
        mockOneToManySendXecTxBuilderObj.transaction.inputs[0].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[1].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[2].value;
    const satoshisToSend = new BigNumber(
        mockOneToManySendXecTxBuilderObj.transaction.tx.outs[0].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[1].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[2].value,
    );
    // for unit test purposes, calculate fee by subtracting satoshisToSend and change amount from totalInputUtxoValue
    const txFee = new BigNumber(totalInputUtxoValue)
        .minus(satoshisToSend)
        .minus(
            new BigNumber(
                mockOneToManySendXecTxBuilderObj.transaction.tx.outs[3].value,
            ),
        ); // change value
    const destinationAddressAndValueArray = null; // invalid as this is mandatory when isOneToMany is true
    let txBuilder = new TransactionBuilder();
    const changeAddress = wallet.Path1899.cashAddress;

    let thrownError;
    try {
        generateTxOutput(
            BCH,
            isOneToMany,
            singleSendValue,
            satoshisToSend,
            totalInputUtxoValue,
            null,
            destinationAddressAndValueArray,
            changeAddress,
            txFee,
            txBuilder,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid tx input parameter');
});

it(`signAndBuildTx() successfully returns a raw tx hex for a tx with a single input and a single output`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const { wallet } = sendBCHMock;
    // add inputs to txBuilder
    txBuilder.addInput(
        mockSingleInputUtxo[0].txid,
        mockSingleInputUtxo[0].vout,
    );

    // add outputs to txBuilder
    const outputAddressAndValue = mockSingleOutput.split(',');
    txBuilder.addOutput(
        outputAddressAndValue[0], // address
        parseInt(fromXecToSatoshis(new BigNumber(outputAddressAndValue[1]))), // value
    );
    const rawTxHex = signAndBuildTx(
        BCH,
        mockSingleInputUtxo,
        txBuilder,
        wallet,
    );
    expect(rawTxHex).toStrictEqual(
        '0200000001582dfa42e2778a2e6b7d32fb1bf4cefc0be9d10a36538e9503465df99cd4a60d000000006b483045022100b4ee5268cb64c4f097e739df7c6934d1df7e75a4f217d5824db18ae2e12554b102204faf039738181aae80c064b928b3d8079a82cdb080ce9a2d5453939a588f4372412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff0158020000000000001976a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac00000000',
    );
});

it(`signAndBuildTx() successfully returns a raw tx hex for a tx with a single input and multiple outputs`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const { wallet } = sendBCHMock;
    // add inputs to txBuilder
    txBuilder.addInput(
        mockSingleInputUtxo[0].txid,
        mockSingleInputUtxo[0].vout,
    );

    // add outputs to txBuilder
    for (let i = 0; i < mockMultipleOutputs.length; i++) {
        const outputAddressAndValue = mockMultipleOutputs[i].split(',');
        txBuilder.addOutput(
            outputAddressAndValue[0], // address
            parseInt(
                fromXecToSatoshis(new BigNumber(outputAddressAndValue[1])),
            ), // value
        );
    }

    const rawTxHex = signAndBuildTx(
        BCH,
        mockSingleInputUtxo,
        txBuilder,
        wallet,
    );
    expect(rawTxHex).toStrictEqual(
        '0200000001582dfa42e2778a2e6b7d32fb1bf4cefc0be9d10a36538e9503465df99cd4a60d000000006b483045022100df29734c4fb348b0e8b613ce522c10c5ac14cb3ecd32843dc7fcf004d60f1b8a022023c4ae02b38c7272e29f344902ae2afa4db1ec37d582a31c16650a0abc4f480c412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff0326020000000000001976a914f627e51001a51a1a92d8927808701373cf29267f88ac26020000000000001976a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac26020000000000001976a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac00000000',
    );
});

it(`signAndBuildTx() successfully returns a raw tx hex for a tx with multiple inputs and a single output`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const { wallet } = sendBCHMock;
    // add inputs to txBuilder
    for (let i = 0; i < mockMultipleInputUtxos.length; i++) {
        txBuilder.addInput(
            mockMultipleInputUtxos[i].txid,
            mockMultipleInputUtxos[i].vout,
        );
    }
    // add outputs to txBuilder
    const outputAddressAndValue = mockSingleOutput.split(',');
    txBuilder.addOutput(
        outputAddressAndValue[0], // address
        parseInt(fromXecToSatoshis(new BigNumber(outputAddressAndValue[1]))), // value
    );

    const rawTxHex = signAndBuildTx(
        BCH,
        mockMultipleInputUtxos,
        txBuilder,
        wallet,
    );
    expect(rawTxHex).toStrictEqual(
        '0200000003582dfa42e2778a2e6b7d32fb1bf4cefc0be9d10a36538e9503465df99cd4a60d000000006a4730440220541366dd5ea25d65d3044dbde16fc6118ab1aee07c7d0d4c25c9e8aa299f040402203ed2f540948197d4c6a4ae963ad187d145a9fb339e311317b03c6172732e267b412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff7313e804af08113dfa290515390a8ec3ac01448118f2eb556ee168a96ee6acdd000000006b483045022100c1d02c5023f83b87a4f2dd26a7306ed9be9d53ab972bd935b440e45eb54a304302200b99aa2f1a728b3bb1dcbff80742c5fcab991bb74e80fa231255a31d58a6ff7d412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff960dd2f0c47e8a3cf1486b046d879f45a047da3b51aedfb5594138ac857214f1000000006b483045022100bd24d11d7070988848cb4aa2b10748aa0aeb79dc8af39c1f22dc1034b3121e5f02201491026e5f8f6eb566eb17cb195e3da3ff0d9cf01bdd34c944964d33a8d3b1ad412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff0158020000000000001976a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac00000000',
    );
});

it(`signAndBuildTx() successfully returns a raw tx hex for a tx with multiple inputs and multiple outputs`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const { wallet } = sendBCHMock;
    // add inputs to txBuilder
    for (let i = 0; i < mockMultipleInputUtxos.length; i++) {
        txBuilder.addInput(
            mockMultipleInputUtxos[i].txid,
            mockMultipleInputUtxos[i].vout,
        );
    }
    // add outputs to txBuilder
    for (let i = 0; i < mockMultipleOutputs.length; i++) {
        const outputAddressAndValue = mockMultipleOutputs[i].split(',');
        txBuilder.addOutput(
            outputAddressAndValue[0], // address
            parseInt(
                fromXecToSatoshis(new BigNumber(outputAddressAndValue[1])),
            ), // value
        );
    }

    const rawTxHex = signAndBuildTx(
        BCH,
        mockMultipleInputUtxos,
        txBuilder,
        wallet,
    );
    expect(rawTxHex).toStrictEqual(
        '0200000003582dfa42e2778a2e6b7d32fb1bf4cefc0be9d10a36538e9503465df99cd4a60d000000006a47304402203de4e6a512a6bec1d378b6444008484e1be5a0c621dc4b201d67addefffe864602202daf82e76b7594fe1ab54a49380c6b1226ab65551ae6ab9164216b66266f34a1412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff7313e804af08113dfa290515390a8ec3ac01448118f2eb556ee168a96ee6acdd000000006a473044022029f5fcbc9356beb9eae6b9ff9a479e8c8331b95406b6be456fccf9d90f148ea1022028f4e7fa7234f9429535360c8f5dad303e2c5044431615997861b10f26fa8a88412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff960dd2f0c47e8a3cf1486b046d879f45a047da3b51aedfb5594138ac857214f1000000006a473044022049a67738d99006b3523cff818f3626104cf5106bd463be70d22ad179a8cb403b022025829baf67f964202ea77ea7462a5447e32415e7293cdee382ea7ae9374364e8412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff0326020000000000001976a914f627e51001a51a1a92d8927808701373cf29267f88ac26020000000000001976a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac26020000000000001976a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac00000000',
    );
});

it(`signAndBuildTx() throws error on an empty inputUtxo param`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const { wallet } = sendBCHMock;
    let thrownError;
    try {
        signAndBuildTx(BCH, [], txBuilder, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid buildTx parameter');
});

it(`signAndBuildTx() throws error on a null inputUtxo param`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    let txBuilder = new TransactionBuilder();
    const inputUtxo = null; // invalid input param
    const { wallet } = sendBCHMock;
    let thrownError;
    try {
        signAndBuildTx(BCH, inputUtxo, txBuilder, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid buildTx parameter');
});

describe('Correctly executes cash utility functions', () => {
    it(`Correctly converts smallest base unit to smallest decimal for cashDecimals = 2`, () => {
        expect(fromSatoshisToXec(1, 2)).toStrictEqual(new BigNumber(0.01));
    });
    it(`Correctly converts largest base unit to smallest decimal for cashDecimals = 2`, () => {
        expect(fromSatoshisToXec(1000000012345678, 2)).toStrictEqual(
            new BigNumber(10000000123456.78),
        );
    });
    it(`Correctly converts smallest base unit to smallest decimal for cashDecimals = 8`, () => {
        expect(fromSatoshisToXec(1, 8)).toStrictEqual(
            new BigNumber(0.00000001),
        );
    });
    it(`Correctly converts largest base unit to smallest decimal for cashDecimals = 8`, () => {
        expect(fromSatoshisToXec(1000000012345678, 8)).toStrictEqual(
            new BigNumber(10000000.12345678),
        );
    });
    it(`Accepts a cachedWalletState that has not preserved BigNumber object types, and returns the same wallet state with BigNumber type re-instituted`, () => {
        expect(loadStoredWallet(cachedUtxos)).toStrictEqual(
            utxosLoadedFromCache,
        );
    });
    it(`Correctly determines a wallet's balance from its set of non-eToken utxos (nonSlpUtxos)`, () => {
        expect(
            getWalletBalanceFromUtxos(
                validStoredWallet.state.slpBalancesAndUtxos.nonSlpUtxos,
            ),
        ).toStrictEqual(validStoredWallet.state.balances);
    });
    it(`Correctly determines a wallet's zero balance from its empty set of non-eToken utxos (nonSlpUtxos)`, () => {
        expect(
            getWalletBalanceFromUtxos(
                utxosLoadedFromCache.slpBalancesAndUtxos.nonSlpUtxos,
            ),
        ).toStrictEqual(utxosLoadedFromCache.balances);
    });
    it(`Recognizes a stored wallet as valid if it has all required fields`, () => {
        expect(isValidStoredWallet(validStoredWallet)).toBe(true);
    });
    it(`Recognizes a stored wallet as invalid if it is missing required fields`, () => {
        expect(isValidStoredWallet(invalidStoredWallet)).toBe(false);
    });
    it(`Recognizes a stored wallet as invalid if it includes hydratedUtxoDetails in the state field`, () => {
        expect(isValidStoredWallet(invalidpreChronikStoredWallet)).toBe(false);
    });
    it(`Converts a legacy BCH amount to an XEC amount`, () => {
        expect(fromLegacyDecimals(0.00000546, 2)).toStrictEqual(5.46);
    });
    it(`Leaves a legacy BCH amount unchanged if currency.cashDecimals is 8`, () => {
        expect(fromLegacyDecimals(0.00000546, 8)).toStrictEqual(0.00000546);
    });
    it(`convertToEcashPrefix converts a bitcoincash: prefixed address to an ecash: prefixed address`, () => {
        expect(
            convertToEcashPrefix(
                'bitcoincash:qz2708636snqhsxu8wnlka78h6fdp77ar5ulhz04hr',
            ),
        ).toBe('ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035');
    });
    it(`convertToEcashPrefix returns an ecash: prefix address unchanged`, () => {
        expect(
            convertToEcashPrefix(
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            ),
        ).toBe('ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035');
    });
    it(`toLegacyToken returns an etoken: prefix address as simpleledger:`, () => {
        expect(
            toLegacyToken('etoken:qz2708636snqhsxu8wnlka78h6fdp77ar5tv2tzg4r'),
        ).toBe('simpleledger:qz2708636snqhsxu8wnlka78h6fdp77ar5syue64fa');
    });
    it(`toLegacyToken returns an prefixless valid etoken address in simpleledger: format with prefix`, () => {
        expect(
            toLegacyToken('qz2708636snqhsxu8wnlka78h6fdp77ar5tv2tzg4r'),
        ).toBe('simpleledger:qz2708636snqhsxu8wnlka78h6fdp77ar5syue64fa');
    });
    it(`Recognizes a wallet with missing Path1889 is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingPath1899Wallet)).toBe(true);
    });
    it(`Recognizes a wallet with missing PublicKey in Path1889 is a Legacy Wallet and requires migration`, () => {
        expect(
            isLegacyMigrationRequired(missingPublicKeyInPath1899Wallet),
        ).toBe(true);
    });
    it(`Recognizes a wallet with missing PublicKey in Path145 is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingPublicKeyInPath145Wallet)).toBe(
            true,
        );
    });
    it(`Recognizes a wallet with missing PublicKey in Path245 is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingPublicKeyInPath245Wallet)).toBe(
            true,
        );
    });
    it(`Recognizes a wallet with missing Hash160 values is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingHash160)).toBe(true);
    });
    it(`Recognizes a latest, current wallet that does not require migration`, () => {
        expect(isLegacyMigrationRequired(notLegacyWallet)).toBe(false);
    });

    test('toHash160() converts a valid bitcoincash: prefix address to a hash160', () => {
        const result = toHash160(
            'bitcoincash:qq9h6d0a5q65fgywv4ry64x04ep906mdku7ymranw3',
        );
        expect(result).toStrictEqual(
            '0b7d35fda03544a08e65464d54cfae4257eb6db7',
        );
    });
    test('toHash160 throws error if input address is an invalid bitcoincash: address', () => {
        const address = 'bitcoincash:qqd3qnINVALIDDDDDDDDDza25m';

        let errorThrown;
        try {
            toHash160(address);
        } catch (err) {
            errorThrown = err.message;
        }
        expect(errorThrown).toStrictEqual('Invalid address: ' + address + '.');
    });
    test('toHash160() converts a valid ecash: prefix address to a hash160', () => {
        const result = toHash160(
            'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
        );
        expect(result).toStrictEqual(
            '0b7d35fda03544a08e65464d54cfae4257eb6db7',
        );
    });
    test('toHash160 throws error if input address is an invalid ecash address', () => {
        const address = 'ecash:qqd3qn4zINVALIDDDDDtfza25m';

        let errorThrown;
        try {
            toHash160(address);
        } catch (err) {
            errorThrown = err.message;
        }
        expect(errorThrown).toStrictEqual('Invalid address: ' + address + '.');
    });
    test('toHash160() converts a valid etoken: address to a hash160', () => {
        const result = toHash160(
            'etoken:qq9h6d0a5q65fgywv4ry64x04ep906mdkufhx2swv3',
        );
        expect(result).toStrictEqual(
            '0b7d35fda03544a08e65464d54cfae4257eb6db7',
        );
    });
    test('toHash160 throws error if input address is an invalid etoken: address', () => {
        const address = 'etoken:qq9h6d0a5INVALIDDDDDDx2swv3';

        let errorThrown;
        try {
            toHash160(address);
        } catch (err) {
            errorThrown = err.message;
        }
        expect(errorThrown).toStrictEqual('Invalid address: ' + address + '.');
    });
    test('toHash160() converts a valid simpleledger: address to a hash160', () => {
        const result = toHash160(
            'simpleledger:qq9h6d0a5q65fgywv4ry64x04ep906mdkujlscgns0',
        );
        expect(result).toStrictEqual(
            '0b7d35fda03544a08e65464d54cfae4257eb6db7',
        );
    });
    test('toHash160 throws error if input address is an invalid simpleledger: address', () => {
        const address = 'simpleledger:qq9h6d0a5qINVALIDDDjlscgns0';

        let errorThrown;
        try {
            toHash160(address);
        } catch (err) {
            errorThrown = err.message;
        }
        expect(errorThrown).toStrictEqual('Invalid address: ' + address + '.');
    });

    test('toLegacyCash() converts a valid ecash: prefix address to a valid bitcoincash: prefix address', async () => {
        const result = toLegacyCash(
            'ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc',
        );
        expect(result).toStrictEqual(
            'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0',
        );
    });

    test('toLegacyCash() converts a valid ecash: prefixless address to a valid bitcoincash: prefix address', async () => {
        const result = toLegacyCash(
            'qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc',
        );
        expect(result).toStrictEqual(
            'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0',
        );
    });

    test('toLegacyCash throws error if input address has invalid checksum', async () => {
        const result = toLegacyCash(
            'ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25m',
        );
        expect(result).toStrictEqual(
            new Error(
                'ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25m is not a valid ecash address',
            ),
        );
    });

    test('toLegacyCash() throws error with input of etoken: address', async () => {
        const result = toLegacyCash(
            'etoken:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4g9htlunl0',
        );
        expect(result).toStrictEqual(
            new Error(
                'etoken:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4g9htlunl0 is not a valid ecash address',
            ),
        );
    });

    test('toLegacyCash() throws error with input of legacy address', async () => {
        const result = toLegacyCash('13U6nDrkRsC3Eb1pxPhNY8XJ5W9zdp6rNk');
        expect(result).toStrictEqual(
            new Error(
                '13U6nDrkRsC3Eb1pxPhNY8XJ5W9zdp6rNk is not a valid ecash address',
            ),
        );
    });

    test('toLegacyCash() throws error with input of bitcoincash: address', async () => {
        const result = toLegacyCash(
            'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0',
        );
        expect(result).toStrictEqual(
            new Error(
                'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0 is not a valid ecash address',
            ),
        );
    });

    test('toLegacyCashArray throws error if the addressArray input is null', async () => {
        const result = toLegacyCashArray(null);

        expect(result).toStrictEqual(new Error('Invalid addressArray input'));
    });

    test('toLegacyCashArray throws error if the addressArray input is empty', async () => {
        const result = toLegacyCashArray([]);

        expect(result).toStrictEqual(new Error('Invalid addressArray input'));
    });

    test('toLegacyCashArray throws error if the addressArray input is a number', async () => {
        const result = toLegacyCashArray(12345);

        expect(result).toStrictEqual(new Error('Invalid addressArray input'));
    });

    test('toLegacyCashArray throws error if the addressArray input is undefined', async () => {
        const result = toLegacyCashArray(undefined);

        expect(result).toStrictEqual(new Error('Invalid addressArray input'));
    });

    test('toLegacyCashArray successfully converts a standard sized valid addressArray input', async () => {
        const result = toLegacyCashArray(validAddressArrayInput);

        expect(result).toStrictEqual(validAddressArrayOutput);
    });

    test('toLegacyCashArray successfully converts a standard sized valid addressArray input including prefixless ecash addresses', async () => {
        const result = toLegacyCashArray(validAddressArrayInputMixedPrefixes);

        expect(result).toStrictEqual(validAddressArrayOutput);
    });

    test('toLegacyCashArray successfully converts a large valid addressArray input', async () => {
        const result = toLegacyCashArray(validLargeAddressArrayInput);

        expect(result).toStrictEqual(validLargeAddressArrayOutput);
    });

    test('toLegacyCashArray throws an error on an addressArray with invalid addresses', async () => {
        const result = toLegacyCashArray(invalidAddressArrayInput);

        expect(result).toStrictEqual(
            new Error(
                'ecash:qrqgwxrrrrrrrrrrrrrrrrrrrrrrrrr7zsvk is not a valid ecash address',
            ),
        );
    });

    test('parseOpReturn() successfully parses a short cashtab message', async () => {
        const result = parseOpReturn(shortCashtabMessageInputHex);
        expect(result).toStrictEqual(mockParsedShortCashtabMessageArray);
    });

    test('parseOpReturn() successfully parses a long cashtab message where an additional PUSHDATA1 is present', async () => {
        const result = parseOpReturn(longCashtabMessageInputHex);
        expect(result).toStrictEqual(mockParsedLongCashtabMessageArray);
    });

    test('parseOpReturn() successfully parses a short external message', async () => {
        const result = parseOpReturn(shortExternalMessageInputHex);
        expect(result).toStrictEqual(mockParsedShortExternalMessageArray);
    });

    test('parseOpReturn() successfully parses a long external message where an additional PUSHDATA1 is present', async () => {
        const result = parseOpReturn(longExternalMessageInputHex);
        expect(result).toStrictEqual(mockParsedLongExternalMessageArray);
    });

    test('parseOpReturn() successfully parses an external message that is segmented into separate short parts', async () => {
        const result = parseOpReturn(shortSegmentedExternalMessageInputHex);
        expect(result).toStrictEqual(
            mockParsedShortSegmentedExternalMessageArray,
        );
    });

    test('parseOpReturn() successfully parses an external message that is segmented into separate long parts', async () => {
        const result = parseOpReturn(longSegmentedExternalMessageInputHex);
        expect(result).toStrictEqual(
            mockParsedLongSegmentedExternalMessageArray,
        );
    });

    test('parseOpReturn() successfully parses an external message that is segmented into separate long and short parts', async () => {
        const result = parseOpReturn(mixedSegmentedExternalMessageInputHex);
        expect(result).toStrictEqual(
            mockParsedMixedSegmentedExternalMessageArray,
        );
    });

    test('parseOpReturn() successfully parses an eToken output', async () => {
        const result = parseOpReturn(eTokenInputHex);
        expect(result).toStrictEqual(mockParsedETokenOutputArray);
    });

    test('parseOpReturn() successfully parses an airdrop transaction', async () => {
        const result = parseOpReturn(mockAirdropHexOutput);
        // verify the hex output is parsed correctly
        expect(result).toStrictEqual(mockParsedAirdropMessageArray);
        // verify airdrop hex prefix is contained in the array returned from parseOpReturn()
        expect(
            result.find(
                element => element === currency.opReturn.appPrefixesHex.airdrop,
            ),
        ).toStrictEqual(currency.opReturn.appPrefixesHex.airdrop);
    });

    test('convertEtokenToEcashAddr successfully converts a valid eToken address to eCash', async () => {
        const result = convertEtokenToEcashAddr(
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs',
        );
        expect(result).toStrictEqual(
            'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8',
        );
    });

    test('convertEtokenToEcashAddr successfully converts prefixless eToken address as input', async () => {
        const result = convertEtokenToEcashAddr(
            'qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs',
        );
        expect(result).toStrictEqual(
            'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8',
        );
    });

    test('convertEtokenToEcashAddr throws error with an invalid eToken address as input', async () => {
        const result = convertEtokenToEcashAddr('etoken:qpj9gcldpffcs');
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: etoken:qpj9gcldpffcs is not a valid etoken address',
            ),
        );
    });

    test('convertEtokenToEcashAddr throws error with an ecash address as input', async () => {
        const result = convertEtokenToEcashAddr(
            'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8',
        );
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8 is not a valid etoken address',
            ),
        );
    });

    test('convertEtokenToEcashAddr throws error with null input', async () => {
        const result = convertEtokenToEcashAddr(null);
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: No etoken address provided',
            ),
        );
    });

    test('convertEtokenToEcashAddr throws error with empty string input', async () => {
        const result = convertEtokenToEcashAddr('');
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: No etoken address provided',
            ),
        );
    });

    test('convertEcashtoEtokenAddr successfully converts a valid ecash address into an etoken address', async () => {
        const eCashAddress = 'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8';
        const eTokenAddress =
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs';
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(eTokenAddress);
    });

    test('convertEcashtoEtokenAddr successfully converts a valid prefix-less ecash address into an etoken address', async () => {
        const eCashAddress = 'qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8';
        const eTokenAddress =
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs';
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(eTokenAddress);
    });

    test('convertEcashtoEtokenAddr throws error with invalid ecash address input', async () => {
        const eCashAddress = 'ecash:qpaNOTVALIDADDRESSwu8';
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(
            new Error(eCashAddress + ' is not a valid ecash address'),
        );
    });

    test('convertEcashtoEtokenAddr throws error with a valid etoken address input', async () => {
        const eTokenAddress =
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs';
        const result = convertEcashtoEtokenAddr(eTokenAddress);
        expect(result).toStrictEqual(
            new Error(eTokenAddress + ' is not a valid ecash address'),
        );
    });

    test('convertEcashtoEtokenAddr throws error with a valid bitcoincash address input', async () => {
        const bchAddress =
            'bitcoincash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9g0vsgy56s';
        const result = convertEcashtoEtokenAddr(bchAddress);
        expect(result).toStrictEqual(
            new Error(bchAddress + ' is not a valid ecash address'),
        );
    });

    test('convertEcashtoEtokenPrefix throws error with null ecash address input', async () => {
        const eCashAddress = null;
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(
            new Error(eCashAddress + ' is not a valid ecash address'),
        );
    });

    it(`flattenContactList flattens contactList array by returning an array of addresses`, () => {
        expect(
            flattenContactList([
                {
                    address: 'ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr',
                    name: 'Alpha',
                },
                {
                    address: 'ecash:qpq235n3l3u6ampc8slapapnatwfy446auuv64ylt2',
                    name: 'Beta',
                },
                {
                    address: 'ecash:qz50e58nkeg2ej2f34z6mhwylp6ven8emy8pp52r82',
                    name: 'Gamma',
                },
            ]),
        ).toStrictEqual([
            'ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr',
            'ecash:qpq235n3l3u6ampc8slapapnatwfy446auuv64ylt2',
            'ecash:qz50e58nkeg2ej2f34z6mhwylp6ven8emy8pp52r82',
        ]);
    });

    it(`flattenContactList flattens contactList array of length 1 by returning an array of 1 address`, () => {
        expect(
            flattenContactList([
                {
                    address: 'ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr',
                    name: 'Alpha',
                },
            ]),
        ).toStrictEqual(['ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr']);
    });
    it(`flattenContactList returns an empty array for invalid input`, () => {
        expect(flattenContactList(false)).toStrictEqual([]);
    });
    it(`getHashArrayFromWallet returns false for a legacy wallet`, () => {
        expect(
            getHashArrayFromWallet(mockLegacyWallets.legacyAlphaMainnet),
        ).toBe(false);
    });
    it(`Successfully extracts a hash160 array from a migrated wallet object`, () => {
        expect(
            getHashArrayFromWallet(
                mockLegacyWallets.migratedLegacyAlphaMainnet,
            ),
        ).toStrictEqual([
            '960c9ed561f1699f0c49974d50b3bb7cdc118625',
            '2be0e0c999e7e77a443ea726f82c441912fca92b',
            'ba8257db65f40359989c7b894c5e88ed7b6344f6',
        ]);
    });
    it(`isActiveWebsocket returns true for an active chronik websocket connection`, () => {
        expect(isActiveWebsocket(activeWebsocketAlpha)).toBe(true);
    });
    it(`isActiveWebsocket returns false for a disconnected chronik websocket connection`, () => {
        expect(isActiveWebsocket(disconnectedWebsocketAlpha)).toBe(false);
    });
    it(`isActiveWebsocket returns false for a null chronik websocket connection`, () => {
        expect(isActiveWebsocket(null)).toBe(false);
    });
    it(`isActiveWebsocket returns false for an active websocket connection with no subscriptions`, () => {
        expect(isActiveWebsocket(unsubscribedWebsocket)).toBe(false);
    });
    it(`getCashtabByteCount for 2 inputs, 2 outputs returns the same value as BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );`, () => {
        const BCH = new BCHJS();
        // 374
        expect(getCashtabByteCount(2, 2)).toBe(
            BCH.BitcoinCash.getByteCount({ P2PKH: 2 }, { P2PKH: 2 }),
        );
    });
    it(`getCashtabByteCount for 1 input, 2 outputs returns the same value as BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );`, () => {
        const BCH = new BCHJS();
        expect(getCashtabByteCount(1, 2)).toBe(
            BCH.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 2 }),
        );
    });
    it(`getCashtabByteCount for 173 input, 1 outputs returns the same value as BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );`, () => {
        const BCH = new BCHJS();
        expect(getCashtabByteCount(173, 1)).toBe(
            BCH.BitcoinCash.getByteCount({ P2PKH: 173 }, { P2PKH: 1 }),
        );
    });
    it(`getCashtabByteCount for 1 input, 2000 outputs returns the same value as BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );`, () => {
        const BCH = new BCHJS();
        expect(getCashtabByteCount(1, 2000)).toBe(
            BCH.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 2000 }),
        );
    });
    it('calculates fee correctly for 2 P2PKH outputs', () => {
        const utxosMock = [{}, {}];
        expect(calcFee(utxosMock, 2, 1.01)).toBe(378);
    });
    it(`Gets correct EC Pair from WIF`, () => {
        expect(JSON.stringify(getECPairFromWIF(mockWif))).toBe(
            mockStringifiedECPair,
        );
    });
});
