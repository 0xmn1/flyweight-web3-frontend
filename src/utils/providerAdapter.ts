import { alertCodes, mapMetamaskErrorToMessage } from './alertMap';
import { alertSet, alertStore } from '../redux/alertStore';

import literals from './resources/literals/english.json';
import { serializeError } from 'eth-rpc-errors';

const handleMetamaskError = (err: unknown): void => {
  console.log(err);
  const metamaskErr = serializeError(err);
  const msg = metamaskErr.code
    ? mapMetamaskErrorToMessage(metamaskErr.code)
    : literals.UNKNOWN_ERR;

  const alert = {
    variant: 'secondary',
    code: alertCodes.FAQ,
    msgPrimary: msg,
    msgSecondary: null
  };
  alertStore.dispatch(alertSet(alert));
};

/*
 * Light wrapper for metamask operations.
 * @param func - lambda containing the metamask operations
 * @returns true if lambda succeeded without error, otherwise false
 * @remarks
 * Metamask errors are caught & passed onto {@link handleMetamaskError} to enhance UX
 */
export const tryMetamaskOpAsync = async (func: () => Promise<void>): Promise<boolean> => {
  try {
    await func();
    return true;
  } catch (err) {
    handleMetamaskError(err);
    return false;
  }
};
