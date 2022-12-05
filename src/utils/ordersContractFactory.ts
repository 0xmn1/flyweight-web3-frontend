import { Signer, ethers } from 'ethers';
import { alertSet, alertStore } from '../redux/alertStore';
import { confirmDepositUrls, orderContractAddresses } from './networkMap';

import Big from 'big.js';
import { ContractFactory } from './ethersFactory';
import { alertCodes } from './alertMap';
import axios from 'axios';
import { connectionStore } from '../redux/connectionStore';
import erc20ContractAbi from './resources/abi-erc20-contract.json';
import gasLimits from './resources/gas-limits.json';
import literals from './resources/literals/english.json';
import ordersContractAbi from './resources/abi-orders-smart-contract.json';
import { tryMetamaskOpAsync } from './providerAdapter';

export class Order {
  constructor(
    public tokenInDecimalAmount: number,
    public tokenInSymbol: string,
    public tokenOutSymbol: string,
    public triggerDirection: number,
    public triggerPrice: string,
  ) {
  }
}

export type OrderResponseDto = {
  id: { _hex: string },
  owner: string,
  tokenInAmount: { _hex: string },
  tokenIn: string,
  tokenInTriggerPrice: string,
  tokenOut: string,
  direction: number,
  orderState: number,
};

export class OrderResponse {
  constructor(
    public orderId: number,
    public anonOrderId: string,
    public tokenInAmount: string,
    public tokenIn: string,
    public tokenOut: string,
    public direction: string,
    public tokenInTriggerPrice: string,
    public orderState: string,
  ) {
  }
}

const setAlert = (variant: string, code: number, msgPrimary: string, msgSecondary: string | null) => {
  const alert = { variant, code, msgPrimary, msgSecondary };
  alertStore.dispatch(alertSet(alert));
};

const confirmDeposit = async (networkId: string, signer: Signer) => {
  const confirmDepositUrl = confirmDepositUrls[networkId];
  const address = await signer.getAddress();
  console.log('Triggering deposit confirmation...');
  setAlert('info', alertCodes.HOW_DEPOSIT_VERIFIED, literals.DEPOSIT_CONFIRM, literals.TX_PROCESSING_2);

  const maxEthBlockTime = 16000;  // Permitted max block time for ethereum PoS. This "max" is based on 2017-2022 historical block time data.
  await new Promise(resolve => setTimeout(resolve, maxEthBlockTime));  // After tx is included in a block, we should wait for the user on-chain deposit to be approved by nodes
  try {
    await axios.put(confirmDepositUrl, {}, {
      headers: {
        'X-Address': address
      }
    });

    console.log('triggered successfully.');
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const addOrder = async (signer: Signer, order: Order) => {
  const networkId = connectionStore.getState().networkId;
  const contractAddress = orderContractAddresses[networkId];
  const contract = ContractFactory.createOrdersWriteContract(contractAddress, ordersContractAbi, signer);
  const tokenInAddresses = await contract.functions.tryGetTokenAddress(order.tokenInSymbol);
  const tokenInAddress = tokenInAddresses[0];
  const tokenInContract = new ethers.Contract(tokenInAddress, erc20ContractAbi, signer);

  const tokenInDecimals = await tokenInContract.functions.decimals();
  const tokenInAmount = new Big(`${order.tokenInDecimalAmount}e${tokenInDecimals}`);
  const tokenInAmountStr = tokenInAmount.toString();

  await tryMetamaskOpAsync(async () => {
    setAlert('primary', alertCodes.WHAT_IS_ETH_TX, literals.CONFIRM_METAMASK_TX_STEP_1, literals.CONFIRM_METAMASK_TX_STEP_EXPLANATION);
    const txNewOrder = await contract.functions.addNewOrder(
      order.tokenInSymbol,
      order.tokenOutSymbol,
      order.triggerPrice,
      order.triggerDirection,
      tokenInAmountStr,
      { gasLimit: gasLimits.ADD_NEW_ORDER },
    );

    setAlert('info', alertCodes.HOW_ORDERS_ADDED, literals.TX_PROCESSING_1, literals.APPROVAL_T);
    const txNewOrderReceipt = await txNewOrder.wait();
    if (txNewOrderReceipt.status === 0) {
      throw txNewOrderReceipt;
    }

    setAlert('primary', alertCodes.CREATE_ORDER_MULTI_TX, literals.CONFIRM_METAMASK_TX_STEP_2, literals.CONFIRM_METAMASK_TX_STEP_2_EXPLANATION);
    const txDeposit = await tokenInContract.transfer(contract.address, tokenInAmountStr, { gasLimit: gasLimits.DEPOSIT });
    setAlert('info', alertCodes.SELF_CUSTODY, literals.FINALIZING, literals.TX_PROCESSING_2);
    const txDepositReceipt = await txDeposit.wait();
    if (txDepositReceipt.status === 0) {
      throw txDepositReceipt;
    }

    if (await confirmDeposit(networkId, signer)) {
      setAlert('success', alertCodes.ORDER_LIVE, literals.ORDER_LIVE, literals.DEX);
    } else {
      setAlert('warning', alertCodes.FAQ, literals.UNKNOWN_ERR, null);
    }
  });
};
