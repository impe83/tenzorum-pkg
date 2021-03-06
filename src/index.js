/* Tenzorum TSNN Client SDK - https://tenzorum.org
 *
 * @author  Radek Ostrowski & Mark Pereira
 */

const utils = require('web3-utils');
const ethUtils = require('ethereumjs-util');
const fetch = require('node-fetch');

let isInitialised = false;

const zeroWei = 0;
export const noData = "0x00";
export const rewardTypeEther = "0x0000000000000000000000000000000000000000";
export const tsnUri = "http://tsnn.tenzorum.xyz:1888/tsnn";

let web3;
let privateKey;
let publicAddress;
let personalWalletAddress;

export const initSdk = (_web3, _privateKey, _personalWalletAddress) => {
    web3 = _web3;
    personalWalletAddress = _personalWalletAddress;
    privateKey = Buffer.from(_privateKey, 'hex');
    publicAddress = ethUtils.bufferToHex(ethUtils.privateToAddress(privateKey));
    isInitialised = true;
}

export const getTsn = async () => {
    const response = await fetch(tsnUri);
    const json = await response.json();
    return json.tsn;
}

export const preparePayload = async (targetWallet, from, to, value, data, rewardType, rewardAmount) => {
    if(!isInitialised) console.log("ERROR: SDK not initialized");

    const personalWalletABI = [{"constant":false,"inputs":[{"name":"_v","type":"uint8"},{"name":"_r","type":"bytes32"},{"name":"_s","type":"bytes32"},{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"},{"name":"_data","type":"bytes"},{"name":"_rewardType","type":"address"},{"name":"_rewardAmount","type":"uint256"}],"name":"execute","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"isActionAccount","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"nonces","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"isMasterAccount","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"roles","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"login","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"masterAccount","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"}];
    const walletInstance = new web3.eth.Contract(personalWalletABI, targetWallet);
    const nonce = await walletInstance.methods.nonces(from).call();
    const hash = ethUtils.toBuffer(utils.soliditySha3(targetWallet, from, to, value, data,
        rewardType, rewardAmount, nonce));

    const signedHash = ethUtils.ecsign(ethUtils.hashPersonalMessage(hash), privateKey);

    let payload = {};
    payload.v = ethUtils.bufferToHex(signedHash.v);
    payload.r = ethUtils.bufferToHex(signedHash.r);
    payload.s = ethUtils.bufferToHex(signedHash.s);
    payload.from = from;
    payload.to = to;
    payload.value = value.toString();
    payload.data = data;
    payload.rewardType = rewardType;
    payload.rewardAmount = rewardAmount.toString();

    // console.log('"'+payload.v+'","'+payload.r+'","'+payload.s+'","'+payload.from+'","'+payload.to+'","'+
    //     payload.value+'","'+payload.data+'","'+payload.rewardType+'","'+payload.rewardAmount+'"');

    return JSON.stringify(payload);
}

export const prepareTokenTransferData = async (amount, to) => {
    const encoded = await web3.eth.abi.encodeFunctionCall({
        name: 'transfer',
        type: 'function',
        inputs: [{
            type: 'address',
            name: 'to'
        }, {
            type: 'uint256',
            name: 'amount'
        }]
    }, [to, amount]);
    return encoded;
}

export const prepareAddMasterData = async (account) => {
    const encoded = await web3.eth.abi.encodeFunctionCall({
        name: 'addMasterAccount',
        type: 'function',
        inputs: [{
            type: 'address',
            name: 'account'
        }]
    }, [account]);
    return encoded;
}

export const prepareAddActionData = async (account) => {
    const encoded = await web3.eth.abi.encodeFunctionCall({
        name: 'addActionAccount',
        type: 'function',
        inputs: [{
            type: 'address',
            name: 'account'
        }]
    }, [account]);
    return encoded;
}

export const transferEtherNoReward = async (ethAmountInWei, toAddress) => {
    return await preparePayload(personalWalletAddress, publicAddress, toAddress, ethAmountInWei, noData, rewardTypeEther, zeroWei);
}

export const transferEtherWithEtherReward = async (ethAmountInWei, toAddress, rewardAmount) => {
    return await preparePayload(personalWalletAddress, publicAddress, toAddress, ethAmountInWei, noData, rewardTypeEther, rewardAmount);
}

export const transferTokensNoReward = async (tokenAddress, amount, toAddress) => {
    const data = await prepareTokenTransferData(amount, toAddress);
    return await preparePayload(personalWalletAddress, publicAddress, tokenAddress, zeroWei, data, rewardTypeEther, zeroWei);
}

export const transferTokensWithTokenReward = async (tokenAddress, amount, toAddress, rewardAmount) => {
    const data = await prepareTokenTransferData(amount, toAddress);
    return await preparePayload(personalWalletAddress, publicAddress, tokenAddress, zeroWei, data, tokenAddress, rewardAmount);
}

export const addMasterNoReward = async (account) => {
    const data = await prepareAddMasterData(account);
    return await preparePayload(personalWalletAddress, publicAddress, personalWalletAddress, zeroWei, data, rewardTypeEther, zeroWei);
}

export const addActionNoReward = async (account) => {
    const data = await prepareAddActionData(account);
    return await preparePayload(personalWalletAddress, publicAddress, personalWalletAddress, zeroWei, data, rewardTypeEther, zeroWei);
}

module.exports = {
    initSdk,
    getTsn,
    transferEtherNoReward,
    transferEtherWithEtherReward,
    transferTokensNoReward,
    transferTokensWithTokenReward,
    addMasterNoReward,
    addActionNoReward
}
