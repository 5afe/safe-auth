import {
  SafeAuthPack,
  SafeAuthConfig,
  SafeAuthInitOptions,
  AuthKitSignInData,
} from '@safe-global/auth-kit';
import { MetaTransactionData } from '@safe-global/safe-core-sdk-types';
import Safe, { EthersAdapter } from '@safe-global/protocol-kit';
import { ethers } from 'ethers';
import { SUPPORTED_NETWORKS } from '@toruslabs/ethereum-controllers';

let signInData: AuthKitSignInData;
let provider: ethers.providers.Web3Provider;

// Use the desired txServiceUrl
const safeAuthConfig: SafeAuthConfig = {
  txServiceUrl: 'https://safe-transaction-gnosis-chain.safe.global',
};

// Configure the chain. Same as the txServiceUrl above
const safeAuthInitOptions: SafeAuthInitOptions = {
  enableLogging: true,
  showWidgetButton: false,
  chainConfig: SUPPORTED_NETWORKS['0x64'],
};

const safeAuthPack = new SafeAuthPack(safeAuthConfig);
await safeAuthPack.init(safeAuthInitOptions);

document.querySelector('#sign-in')?.addEventListener('click', async () => {
  signInData = await safeAuthPack.signIn();
});

document
  .querySelector('#execute-transaction')
  ?.addEventListener('click', async () => {
    if (!signInData?.safes?.length) {
      console.error('No safes found for this the current signer');
      return;
    }

    // Wrap the adapter
    provider = new ethers.providers.Web3Provider(
      safeAuthPack.getProvider() as ethers.providers.ExternalProvider
    );
    const signer = provider.getSigner();

    // Create the Safe EthersAdapter
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: signer || provider,
    });

    // Create the Safe protocol kit instance
    const protocolKit = await Safe.create({
      ethAdapter,
      safeAddress: signInData?.safes?.[0] || '', // Use a Safe with funds
    });

    const initialBalance = await protocolKit.getBalance();
    console.log(
      `The initial balance of the Safe: ${ethers.utils.formatUnits(
        initialBalance,
        'ether'
      )} xDAI`
    );

    // Create a Safe transaction with the provided parameters
    const tx = await protocolKit.createTransaction({
      safeTransactionData: {
        to: signInData?.eoa || '0x', // Address to send the funds from the Safe
        data: '0x',
        value: ethers.utils.parseUnits('0.0001', 'ether').toString(),
      },
    });

    await protocolKit.executeTransaction(tx);

    const finalBalance = await protocolKit.getBalance();

    console.log(
      `The final balance of the Safe: ${ethers.utils.formatUnits(
        finalBalance,
        'ether'
      )} xDAI`
    );
  });

document.querySelector('#sign-out')?.addEventListener('click', async () => {
  await safeAuthPack.signOut();
});
