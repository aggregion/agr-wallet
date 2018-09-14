import {environment} from '../environments/environment';

export const mainnetId = environment.production ? '41c4c54a375c767f11654a907541633bdddf158a8f0c394f657980bc484c91c9' : 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f';
export const genesistx = environment.production ? 'd88a9f0cb7d4000f084a83fe9aa5a296c58a0173dec00346374936de90055e10' : '6201165da0c9c9ad0c726c72708a6bc6443d364149fedd8e7abcd0d214a1314e';
export const txrefBlock = environment.production ? 2 : 359098;
export const voterefBlock = txrefBlock;
export const voteref = genesistx;

export const endpoint = environment.production ? 'https://mainnet-node1.blockchain.aggregion.com' : 'https://devnet.blockchain.aggregion.com';
