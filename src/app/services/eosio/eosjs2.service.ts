import {Injectable} from '@angular/core';
import {SignatureProvider, SignatureProviderArgs} from 'eosjs/dist/eosjs-api-interfaces';
import {Api, JsonRpc} from 'eosjs';
import {PushTransactionArgs} from 'eosjs/dist/eosjs-rpc-interfaces';
import {JsSignatureProvider, PrivateKey, PublicKey} from 'eosjs/dist/eosjs-jssig';

import {
    convertFraction,
    makeAsset,
    makeDelegateBW,
    makeSingleKeyAuth,
    makeUndelegateBW,
    parseTokenValue,
} from '../../helpers/aux_functions';
import {BehaviorSubject, Subject} from 'rxjs';
import { localConfig } from '../../../config';
import { environment } from '../../../environments/environment';

export class SimpleosSigProvider implements SignatureProvider {
    localRPC: JsonRpc;

    constructor(_rpc: JsonRpc) {
        this.localRPC = _rpc;
    }

    async processTrx(binaryData) {
        const args = {
            rpc: this.localRPC,
            authorityProvider: undefined,
            abiProvider: undefined,
            signatureProvider: this,
            chainId: undefined,
            textEncoder: undefined,
            textDecoder: undefined,
        };
        const api = new Api(args);
        return await api.deserializeTransactionWithActions(binaryData);
    }

    getAvailableKeys(): Promise<string[]> {
        console.log('get available keys');
        return new Promise((resolve) => {
            resolve(['']);
        });
    }

    sign(args: SignatureProviderArgs): Promise<PushTransactionArgs> {
        console.log('Incoming signature request');
        console.log(args);
        return new Promise((resolve) => {
            resolve({
                signatures: [''],
                serializedTransaction: new Uint8Array(),
            });
        });
    }
}

@Injectable({
    providedIn: 'root',
})
export class Eosjs2Service {

    public online = new BehaviorSubject<boolean>(false);
    public status = new Subject<Boolean>();

    public ecc: any;
    rpc: JsonRpc;
    public localSigProvider: SimpleosSigProvider;
    public activeEndpoint: string;
    public alternativeEndpoints: any[];
    public chainId: string;
    private api: Api;

    private txOpts = {
        blocksBehind: 3,
        expireSeconds: 120,
        broadcast: true,
        sign: true,
    };

    baseConfig = {
        keyProvider: [],
        httpEndpoint: '',
        expireInSeconds: 60,
        broadcast: true,
        debug: false,
        sign: true,
        chainId: '',
    };

    configLS: any;
    activeChain: string;
    defaultChain: any;
    defaultMainnetEndpoint: string;
    EOSMainnetChain: any;
    EOStMainnetEndpoint: string;

    constructor() {
        this.activeChain = localStorage.getItem('simplEOS.activeChainID');
        this.configLS = {
            config: localConfig
        };

        this.defaultChain = this.configLS.config.chains.find(chain => chain.id === this.activeChain);
        if (this.defaultChain) {
            this.defaultMainnetEndpoint = this.defaultChain.firstApi;
        } else {
            this.activeChain = environment.production ? "6d2cd42cb31c1440e4601a7d557082f6642196792b247eab1350e64da48000b3" : "b3b5cc8cbf011f851f77831a31c2d1fc55de8ff677035a5e8ef16c84fa8fa93d";
            this.defaultChain = this.configLS.config.chains.find(chain => chain.id === this.activeChain);
            this.defaultMainnetEndpoint = this.defaultChain.firstApi;
        }

        this.EOSMainnetChain = this.configLS.config.chains.find(chain => chain.name === 'EOS MAINNET');
        this.EOStMainnetEndpoint = this.EOSMainnetChain.firstApi;
    }

    initRPC(endpoint, chainID, allEndpoints) {
        this.activeEndpoint = endpoint;
        this.chainId = chainID;
        this.alternativeEndpoints = allEndpoints;
        this.rpc = new JsonRpc(this.activeEndpoint);
        this.localSigProvider = new SimpleosSigProvider(this.rpc);
    }

    createApi(key): Api {
        return new Api({
            rpc: this.rpc,
            signatureProvider: new JsSignatureProvider([key]),
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
        });
    }

    initAPI(key) {
        this.api = this.createApi(key);
        setTimeout(() => {
            this.api = null;
        }, 5000);
    }

    async signTrx(trx: any, shouldBroadcast: boolean) {
        const packedTransaction = await this.api.transact(trx, {
            blocksBehind: 3,
            expireSeconds: 120,
            broadcast: false,
            sign: true,
        });
        if (shouldBroadcast) {
            const result = await this.api.pushSignedTransaction(packedTransaction);
            return {result, packedTransaction};
        } else {
            return {packedTransaction};
        }
    }

    transact(trx) {
        if (this.api) {
            return this.api.transact(trx, {
                blocksBehind: 3,
                expireSeconds: 120,
            });
        } else {
            return new Promise(resolve => {
                resolve('wrong_pass');
            });
        }
    }

    async getTableRows(_code: string, _scope: string, _table: string, _limit?: number, _lower_bound?: number) {
        if (this.rpc) {
            try {
                return this.rpc.get_table_rows({
                    json: true,
                    code: _code,
                    scope: _scope,
                    table: _table,
                    limit: _limit,
                    lower_bound: _lower_bound,
                });
            } catch (e) {
                console.log(e);
                return null;
            }
        }
    }

    async getMainnetTableRows(_code: string, _scope: string, _table: string) {
        const tempRpc = new JsonRpc(this.defaultMainnetEndpoint);
        return tempRpc.get_table_rows({
            code: _code,
            scope: _scope,
            table: _table,
        });
    }

    async getRexPool(): Promise<any> {
        const rexpool = await this.rpc.get_table_rows({
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'rexpool',
        });
        return rexpool.rows[0];
    }

    async getRexData(_account: string): Promise<any> {
        const rexbal_rows = await this.rpc.get_table_rows({
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'rexbal',
            lower_bound: _account,
            limit: 1,
        });
        const rexbal_data = rexbal_rows.rows.find(
            row => row.owner === _account);
        const rexfund_rows = await this.rpc.get_table_rows({
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'rexfund',
            lower_bound: _account,
            limit: 1,
        });
        const rexfund_data = rexfund_rows.rows.find(
            row => row.owner === _account);
        return {
            rexbal: rexbal_data,
            rexfund: rexfund_data,
        };
    }

    async getAccountActions(account, position, offset): Promise<any> {
        console.log(`Account: ${account} | Pos: ${position} | Offset: ${offset}`);
        return this.rpc.history_get_actions(account, position, offset);
    }

    async recursiveFetchTableRows(array: any[], _code: string, _scope: string,
                                  _table: string, _pkey: string, LB: string,
                                  _batch: number) {
        const data = await this.rpc.get_table_rows({
            json: true,
            code: _code,
            scope: _scope,
            table: _table,
            limit: _batch,
            lower_bound: LB,
        });
        let batch_size = _batch;
        if (LB !== '') {
            data.rows.shift();
            batch_size--;
        }
        array.push(...data.rows);
        const last_elem = data.rows[data.rows.length - 1];
        const last_pk = last_elem[_pkey];
        if (data.rows.length === batch_size) {
            await this.recursiveFetchTableRows(array, _code, _scope, _table,
                _pkey, last_pk, _batch);
        }
    }

    async getProxies(contract): Promise<any> {
        console.log('Getting proxy data via chain API');
        const result = {
            rows: [],
        };
        if (contract !== '') {
            await this.recursiveFetchTableRows(result.rows, contract, contract,
                'proxies', 'owner', '', 100);
        }
        return result;
    }

    async getLoans(account: string): Promise<any> {
        const loans = {
            cpu: [],
            net: [],
        };
        const data = await Promise.all([
            this.rpc.get_table_rows({
                json: true,
                code: 'eosio',
                table: 'cpuloan',
                scope: 'eosio',
                index_position: 3,
                key_type: 'i64',
                lower_bound: account,
                limit: 25,
            }), this.rpc.get_table_rows({
                json: true,
                code: 'eosio',
                table: 'netloan',
                scope: 'eosio',
                index_position: 3,
                key_type: 'i64',
                lower_bound: account,
                limit: 25,
            })]);
        // Extract owner's CPU loans
        for (const row of data[0].rows) {
            if (row.from === account) {
                loans.cpu.push(row);
            }
        }
        // Extract owner's NET loans
        for (const row of data[1].rows) {
            if (row.from === account) {
                loans.net.push(row);
            }
        }
        return loans;
    }

    async checkSimpleosUpdate() {
        const tempRpc = new JsonRpc(this.EOStMainnetEndpoint);
        const data = await tempRpc.get_table_rows({
            json: true,
            code: 'simpleosvers',
            scope: 'simpleosvers',
            table: 'info',
        });
        if (data.rows.length > 0) {
            return data.rows[0];
        } else {
            return null;
        }
    }

    async createAccount(creator: string, name: string, owner: string,
                        active: string, delegateAmount: number,
                        rambytes: number, transfer: boolean,
                        giftAmount: number, giftMemo: string, symbol: string,
                        precision: number, permission): Promise<any> {
        const _actions = [];
        const auth = {actor: creator, permission: permission};

        _actions.push({
            account: 'eosio',
            name: 'newaccount',
            authorization: [auth],
            data: {
                creator: creator,
                name: name,
                owner: makeSingleKeyAuth(owner),
                active: makeSingleKeyAuth(active),
            },
        });

        _actions.push({
            account: 'eosio',
            name: 'buyrambytes',
            authorization: [auth],
            data: {
                payer: creator,
                receiver: name,
                bytes: rambytes,
            },
        });

        _actions.push({
            account: 'eosio',
            name: 'delegatebw',
            authorization: [auth],
            data: {
                from: creator, receiver: name,
                stake_net_quantity: makeAsset(delegateAmount * 0.3, symbol, precision),
                stake_cpu_quantity: makeAsset(delegateAmount * 0.7, symbol, precision),
                transfer: transfer,
            },
        });

        if (giftAmount > 0) {
            _actions.push({
                from: creator,
                to: name,
                quantity: makeAsset(giftAmount, symbol, precision),
                memo: giftMemo,
            });
        }

        return this.transact({actions: _actions});
    }

    checkPvtKey(k): Promise<any> {
        try {
            const pubkey = PrivateKey.fromString(k).getPublicKey();
            console.log(pubkey.toString());
            return this.loadPublicKey(pubkey);
        } catch (e) {
            console.log(e);
            return new Promise((resolve, reject) => {
                reject(e);
            });
        }
    }

    async loadPublicKey(pubkey: PublicKey): Promise<any> {
        return new Promise(async (resolve, reject2) => {
            if (pubkey.isValid()) {
                const tempAccData = [];
                const account_names = await this.getKeyAccountsMulti(pubkey.toString());
                console.log(account_names);
                if (account_names.length > 0) {
                    const promiseQueue = [];
                    account_names.forEach((acc) => {
                        promiseQueue.push(new Promise(async (resolve1, reject1) => {
                            let acc_data;
                            try {
                                acc_data = await this.rpc.get_account(acc);
                            } catch (e) {
                                console.log(e);
                                reject1();
                            }
                            try {
                                acc_data['tokens'] = await this.rpc.get_currency_balance('eosio.token', acc);
                            } catch (e) {
                                console.log(e);
                            }
                            tempAccData.push(acc_data);
                            resolve1(acc_data);
                        }));
                    });

                    Promise.all(promiseQueue)
                        .then((results: any[]) => {
                            resolve({
                                foundAccounts: results,
                                publicKey: pubkey.toString(),
                            });
                        })
                        .catch(() => {
                            reject2({
                                message: 'non_active',
                                accounts: tempAccData,
                            });
                        });
                } else {
                    reject2({message: 'no_account'});
                }
            } else {
                reject2({message: 'invalid'});
            }
        });
    }

    async getKeyAccountsMulti(key: string): Promise<string[]> {
        return new Promise(async (resolve) => {
            const accounts: Set<string> = new Set();
            const queue = [];

            // check on selected endpoint first
            const primaryResults: string[] = await new Promise(async (resolve1) => {
                // fire 2 seconds timeout
                let _expired;
                const _t = setTimeout(() => {
                    _expired = true;
                    resolve1();
                }, 2000);

                // check on primary endpoint
                try {
                    const result = await this.rpc.history_get_key_accounts(key);
                    if (result && result.account_names.length > 0) {
                        resolve1(result.account_names);
                    } else {
                        resolve1();
                    }
                } catch (e) {
                    console.log(this.rpc.endpoint, e.message);
                    resolve1();
                }

                if (!_expired) {
                    clearTimeout(_t);
                }
            });

            // resolve directly if accounts are found
            if (primaryResults && primaryResults.length > 0) {
                resolve(primaryResults);
                return;
            }

            // fallback to others
            for (const api of this.alternativeEndpoints) {
                if (api.url !== this.rpc.endpoint && !api.failed) {
                    const tempRpc = new JsonRpc(api.url);
                    queue.push(new Promise(async (innerResolve) => {
                        try {
                            const result = await tempRpc.history_get_key_accounts(key);
                            if (result && result.account_names) {
                                for (const account of result.account_names) {
                                    accounts.add(account);
                                }
                            }
                        } catch (e) {
                            console.log(api.url, e.message);
                            api.failed = true;
                        }
                        innerResolve();
                    }));
                }
            }

            // 5 second timeout if any account has returned, otherwise we wait for all edpoints to return
            let expired;
            const timeout = setTimeout(() => {
                if (accounts.size > 0) {
                    expired = true;
                    resolve([...accounts]);
                }
            }, 5000);
            await Promise.all(queue);
            if (!expired) {
                clearTimeout(timeout);
                resolve([...accounts]);
            }
        });
    }

    async changebw(account, permission, amount, symbol, ratio, fr) {
        const accountInfo = await this.rpc.get_account(account);
        const refund = accountInfo.refund_request;
        const liquid_bal = accountInfo.core_liquid_balance;
        let cpu_v;
        let net_v;
        let wei_cpu: number;
        let wei_net: number;
        let ref_cpu = 0;
        let ref_net = 0;
        let liquid = 0;

        const _div = Math.pow(10, fr);
        const _zero = Number(0).toFixed(fr);

        if (typeof accountInfo.cpu_weight === 'string') {
            wei_cpu = Math.round(parseTokenValue(accountInfo.cpu_weight) / _div);
            wei_net = Math.round(parseTokenValue(accountInfo.net_weight) / _div);
        } else {
            wei_cpu = accountInfo.cpu_weight;
            wei_net = accountInfo.net_weight;
        }

        if (liquid_bal) {
            liquid = Math.round(parseTokenValue(liquid_bal) * _div);
        }

        if (refund) {
            ref_cpu = Math.round(parseTokenValue(refund.cpu_amount) * _div);
            ref_net = Math.round(parseTokenValue(refund.net_amount) * _div);
        }

        const current_stake = wei_cpu + wei_net;
        const new_total = current_stake + amount;
        const new_cpu = new_total * ratio;
        const new_net = new_total * (1 - ratio);
        let cpu_diff = new_cpu - wei_cpu;
        let net_diff = new_net - wei_net;

        if (cpu_diff > (ref_cpu + liquid)) {
            net_diff += (cpu_diff - (ref_cpu + liquid));
            cpu_diff = (ref_cpu + liquid);

        }

        if (net_diff > (ref_net + liquid)) {
            cpu_diff += (cpu_diff - (ref_cpu + liquid));
            net_diff = (ref_net + liquid);

        }

        const acts = [];
        const auth = {actor: account, permission: permission};

        if (cpu_diff < 0 && net_diff >= 0) {
            // Unstake CPU & Stake NET

            // Unstake CPU
            cpu_v = convertFraction(cpu_diff, _div, fr);
            acts.push(makeUndelegateBW(auth, account, account, _zero, cpu_v, symbol));

            // Stake NET
            if (net_diff > 0) {
                net_v = convertFraction(net_diff, _div, fr);
                acts.push(makeDelegateBW(auth, account, account, net_v, _zero, false, symbol));
            }

        } else if (net_diff < 0 && cpu_diff >= 0) {
            // Unstake NET & Stake CPU

            // Unstake NET
            net_v = convertFraction(net_diff, _div, fr);
            acts.push(makeUndelegateBW(auth, account, account, net_v, _zero, symbol));

            // Stake CPU
            if (cpu_diff > 0) {
                cpu_v = convertFraction(cpu_diff, _div, fr);
                acts.push(makeDelegateBW(auth, account, account, _zero, cpu_v, false, symbol));
            }

        } else if (net_diff < 0 && cpu_diff < 0) {

            // Unstake NET & CPU
            cpu_v = convertFraction(cpu_diff, _div, fr);
            net_v = convertFraction(net_diff, _div, fr);
            acts.push(makeUndelegateBW(auth, account, account, net_v, cpu_v, symbol));

        } else {

            // Stake NET & CPU
            cpu_v = convertFraction(cpu_diff, _div, fr);
            net_v = convertFraction(net_diff, _div, fr);
            acts.push(makeDelegateBW(auth, account, account, net_v, cpu_v, false, symbol));

        }
        return acts;
    }

    claimRefunds(account, k, permission): Promise<any> {
        const tempApi = this.createApi(k);
        return tempApi.transact({
            actions: [
                {
                    account: 'eosio',
                    name: 'refund',
                    authorization: [{actor: account, permission: permission}],
                    data: {owner: account},
                }],
        }, this.txOpts);
    }

    listProducers() {
        return this.rpc.get_producers(true, null, 200);
    }

    getChainInfo(): Promise<any> {
        return this.getTableRows('eosio', 'eosio', 'global');
    }

    getRamMarketInfo(): Promise<any> {
        return this.getTableRows('eosio', 'eosio', 'rammarket', -1, 0);
    }

    getDappMetaData(dapp): Promise<any> {
        return this.getTableRows('dappmetadata', dapp, 'dapps');
    }

    listDelegations(account): Promise<any> {
        return this.getTableRows('eosio', account, 'delband');
    }

    getSCAbi(contract) {
        return this.rpc.get_abi(contract);
    }

    getSymbolContract(contract): Promise<any> {
        return this.getTableRows(contract, contract, 'accounts');
    }

    getAccountInfo(name: string) {
        return this.rpc.get_account(name);
    }

    getTokens(name) {
        return this.rpc.get_currency_balance('eosio.token', name);
    }

    pushActionContract(contract, action, form, account, permission) {
        return this.transact({
            actions: [
                {
                    account: contract,
                    name: action,
                    authorization: [{actor: account, permission: permission}],
                    data: form,
                }],
        });
    }

    checkAccountName(name) {
        console.log(`Check format for account name: ${name}`);
        // return this.format['encodeName'](name);
        return 1;
    }
}
