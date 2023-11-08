import {
  SafeAuthPack,
  SafeAuthConfig,
  SafeAuthInitOptions,
  AuthKitSignInData,
} from '@safe-global/auth-kit';
import { ethers } from 'ethers';
import { SUPPORTED_NETWORKS } from '@toruslabs/ethereum-controllers';
import Safe, { EthersAdapter } from '@safe-global/protocol-kit';
import { MetaTransactionData } from '@safe-global/safe-core-sdk-types';
let signInData: AuthKitSignInData;
let provider: ethers.providers.Web3Provider;

const safeAuthConfig: SafeAuthConfig = {
  txServiceUrl: 'https://safe-transaction-gnosis-chain.safe.global',
};

const safeAuthInitOptions: SafeAuthInitOptions = {
  enableLogging: true,
  showWidgetButton: false,
  chainConfig: SUPPORTED_NETWORKS['0x64'],
};

const safeAuthPack = new SafeAuthPack(safeAuthConfig);
await safeAuthPack.init(safeAuthInitOptions);

// q: How to dom ready?

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

    provider = new ethers.providers.Web3Provider(
      safeAuthPack.getProvider() as ethers.providers.ExternalProvider
    );
    const signer = provider.getSigner();
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: signer || provider,
    });
    const protocolKit = await Safe.create({
      ethAdapter,
      safeAddress: signInData?.safes?.[1] || '',
    });

    const initialBalance = await protocolKit.getBalance();

    console.log(
      `The initial balance of the Safe: ${ethers.utils.formatUnits(
        initialBalance,
        'ether'
      )} xDAI`
    );

    // Create a Safe transaction with the provided parameters
    const safeTransactionData: MetaTransactionData = {
      to: signInData?.eoa || '0x',
      data: '0x',
      value: ethers.utils.parseUnits('0.0001', 'ether').toString(),
    };

    const safeTransaction = await protocolKit.createTransaction({
      safeTransactionData,
    });

    await protocolKit.signTransaction(safeTransaction);

    await protocolKit.executeTransaction(safeTransaction);

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
