import { Contract, ContractInterface, Signer, ethers, providers } from 'ethers';

// Provides a blockchain read-only connection without requiring metamask
export const createNodeProvider = (networkName: string, apiKey: string): providers.AlchemyProvider =>
  new ethers.providers.AlchemyProvider(networkName, apiKey);

// Provides a blockchain connection through metamask's injected provider
export const createMetamaskProvider = (window: any): providers.Web3Provider =>
  new ethers.providers.Web3Provider(window.ethereum);

// Creates proxies representing the flyweight smart contract
export abstract class ContractFactory {
  private static contractRead: Contract | null = null;
  private static contractWrite: Contract | null = null;

  static createOrdersReadContract(address: string, abi: ContractInterface, provider: providers.Provider): Contract {
    this.contractRead = this.contractRead || new ethers.Contract(address, abi, provider);
    return this.contractRead;
  }

  static createOrdersWriteContract(address: string, abi: ContractInterface, signer: Signer): Contract {
    this.contractWrite = this.contractWrite || new ethers.Contract(address, abi, signer);
    return this.contractWrite;
  }
}
