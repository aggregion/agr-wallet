import {Injectable} from '@angular/core';

import * as AGRJS from '../assets/eos.js';
import {BehaviorSubject, Subject} from 'rxjs';

@Injectable()
export class AGRJSService {
  agrio: any;
  tokens: any;
  public ecc: any;
  format: any;
  ready: boolean;
  status = new Subject<Boolean>();
  txh: any[];
  actionHistory: any[];
  baseConfig = {
    keyProvider: [],
    httpEndpoint: '',
    expireInSeconds: 60,
    broadcast: true,
    debug: false,
    sign: true,
    chainId: ''
  };
  basePublicKey = '';
  auth = false;
  constitution = '';
  txCheckQueue = [];
  txMonitorInterval = null;

  public accounts = new BehaviorSubject<any>({});
  public online = new BehaviorSubject<boolean>(false);
  public chainID: string;
  public eos: any;

  constructor() {
    this.agrio = null;
    this.ecc = AGRJS.modules['ecc'];
    this.format = AGRJS.modules['format'];
    this.ready = false;
    this.txh = [];
    this.actionHistory = [];
  }

  reloadInstance() {
    this.auth = true;
    this.eos = AGRJS(this.baseConfig);
    setTimeout(() => {
      this.baseConfig.keyProvider = [];
    }, 1000);
  }

  clearInstance() {
    this.baseConfig.keyProvider = [];
    this.eos = AGRJS(this.baseConfig);
  }

  init(url, chain) {
    this.chainID = chain;
    return new Promise((resolve, reject) => {
      this.baseConfig.chainId = this.chainID;
      this.baseConfig.httpEndpoint = url;
      this.eos = AGRJS(this.baseConfig);
      this.eos['getInfo']({}).then(result => {
        this.ready = true;
        this.online.next(result['head_block_num'] - result['last_irreversible_block_num'] < 400);
        let savedAcc = [];
        const savedpayload = localStorage.getItem('Aggregion Wallet.accounts.' + this.chainID);
        if (savedpayload) {
          savedAcc = JSON.parse(savedpayload).accounts;
          this.loadHistory();
        }
        this.eos['contract']('agrio').then(contract => {
          this.agrio = contract;
          resolve(savedAcc);
        });
      }).catch((err) => {
        reject(err);
      });
    });
  }

  getKeyAccounts(pubkey) {
    return this.eos.getKeyAccounts(pubkey);
  }

  getAccountInfo(name) {
    return this.eos['getAccount'](name);
  }

  getChainInfo(): Promise<any> {
    if (this.eos) {
      return this.eos['getTableRows']({
        json: true,
        code: 'agrio',
        scope: 'agrio',
        table: 'global'
      });
    } else {
      return new Promise(resolve => {
        resolve();
      });
    }
  }

  getRamMarketInfo(): Promise<any> {
    if (this.eos) {
      return this.eos['getTableRows']({
        json: true,
        code: 'agrio',
        scope: 'agrio',
        table: 'rammarket'
      });
    } else {
      return new Promise(resolve => {
        resolve();
      });
    }
  }

  getRefunds(account): Promise<any> {
    return this.eos['getTableRows']({
      json: true,
      code: 'agrio',
      scope: account,
      table: 'refunds'
    });
  }

  claimRefunds(account, k): Promise<any> {
    this.baseConfig.keyProvider = [k];
    const tempEos = AGRJS(this.baseConfig);
    return tempEos['refund']({owner: account}, {
      broadcast: true,
      sign: true,
      authorization: account + '@active'
    });
  }

  checkAccountName(name) {
    return this.format['encodeName'](name);
  }

  loadPublicKey(pubkey) {
    return new Promise((resolve, reject) => {
      if (this.ecc['isValidPublic'](pubkey)) {
        this.getKeyAccounts(pubkey).then((data) => {
          if (data['account_names'].length > 0) {
            const promiseQueue = [];
            data['account_names'].forEach((acc) => {
              const tempPromise = new Promise((resolve1, reject1) => {
                this.getAccountInfo(acc).then((acc_data) => {
                  if (acc_data.permissions[0]['required_auth']['keys'][0].key === pubkey) {
                    this.getTokens(acc_data['account_name']).then((tokens) => {
                      acc_data['tokens'] = tokens;
                      this.accounts[acc] = acc_data;
                      resolve1(acc_data);
                    }).catch((err) => {
                      console.log(err);
                      reject1();
                    });
                  } else {
                    reject1();
                  }
                });
              });
              promiseQueue.push(tempPromise);
            });
            Promise.all(promiseQueue).then((results) => {
              resolve({
                foundAccounts: results,
                publicKey: pubkey
              });
            }).catch(() => {
              reject({message: 'non_active'});
            });
          } else {
            reject({message: 'no_account'});
          }
        });
      } else {
        reject({message: 'invalid'});
      }
    });
  }

  storeAccountData(accounts) {
    if (accounts) {
      if (accounts.length > 0) {
        this.accounts.next(accounts);
        const payload = JSON.parse(localStorage.getItem('Aggregion Wallet.accounts.' + this.chainID));
        payload.updatedOn = new Date();
        payload.accounts = accounts;
        localStorage.setItem('Aggregion Wallet.accounts.' + this.chainID, JSON.stringify(payload));
      }
    }
  }

  listProducers() {
    return this.eos['getProducers']({json: true, limit: 200});
  }

  getTokens(name) {
    console.log('getTokens', name);
    return this.eos['getCurrencyBalance']('agrio.token', name);
  }

  getTransaction(hash) {
    if (this.ready) {
      this.eos['getTransaction'](hash).then((result) => {
        this.txh.push(result);
        this.saveHistory();
        this.loadHistory();
      });
    }
  }

  getConstitution() {
    this.constitution = '';
  }

  loadHistory() {
    this.actionHistory = [];
  }

  saveHistory() {
    const payload = JSON.stringify(this.txh);
    localStorage.setItem('Aggregion Wallet.txhistory.' + this.chainID, payload);
  }

  async transfer(contract, from, to, amount, memo): Promise<any> {
    if (this.auth) {
      if (contract === 'agrio.token') {
        return new Promise((resolve, reject) => {
          this.eos['transfer'](from, to, amount, memo, (err, trx) => {
            console.log(err, trx);
            if (err) {
              reject(JSON.parse(err));
            } else {
              resolve(true);
            }
          });
        });
      } else {
        return new Promise((resolve, reject) => {
          this.eos['contract'](contract, (err, tokenContract) => {
            if (!err) {
              if (tokenContract['transfer']) {
                tokenContract['transfer'](from, to, amount, memo, (err2, trx) => {
                  console.log(err, trx);
                  if (err2) {
                    reject(JSON.parse(err2));
                  } else {
                    resolve(true);
                  }
                });
              } else {
                reject();
              }
            } else {
              reject(JSON.parse(err));
            }
          });
        });
      }
    }
  }

  checkPvtKey(k): Promise<any> {
    try {
      const pubkey = this.ecc['privateToPublic'](k);
      return this.loadPublicKey(pubkey);
    } catch (e) {
      console.log(e);
      return new Promise((resolve, reject) => {
        reject(e);
      });
    }
  }

  ramBuy() {

  }

  ramSell() {

  }

  async createAccount(creator: string, name: string, owner: string,
                      active: string, delegateAmount: number,
                      rambytes: number, transfer: boolean,
                      giftAmount: number, giftMemo: string): Promise<any> {
    if (this.auth) {
      return this.eos.transaction(tr => {
        tr['newaccount']({creator: creator, name: name, owner: owner, active: active});
        tr['buyrambytes']({payer: creator, receiver: name, bytes: rambytes});
        tr['delegatebw']({
          from: creator, receiver: name,
          stake_net_quantity: (delegateAmount * 0.3).toFixed(4) + ' AGR',
          stake_cpu_quantity: (delegateAmount * 0.7).toFixed(4) + ' AGR',
          transfer: transfer ? 1 : 0
        });
        if (giftAmount > 0) {
          tr['transfer']({
            from: creator,
            to: name,
            quantity: giftAmount.toFixed(4) + ' AGR',
            memo: giftMemo
          });
        }
      });
    } else {
      return new Promise(resolve => resolve(null));
    }
  }

  startMonitoringLoop() {
    if (!this.txMonitorInterval) {
      console.log('Starting monitoring loop!');
      this.txMonitorInterval = setInterval(() => {
        this.eos['getInfo']({}).then((info) => {
          const lib = info['last_irreversible_block_num'];
          if (this.txCheckQueue.length > 0) {
            console.log('Loop pass - LIB = ' + lib);
            this.txCheckQueue.forEach((tx, idx) => {
              console.log(tx);
              if (lib > tx.block) {
                this.eos['getTransaction']({id: tx.id}).then((result) => {
                  console.log(result.id);
                  if (result.id === tx.id) {
                    this.txh.push(result);
                    console.log(result);
                    this.txCheckQueue.splice(idx, 1);
                    this.saveHistory();
                    this.loadHistory();
                  }
                });
              }
            });
          } else {
            if (this.txMonitorInterval !== null) {
              console.log('Stopping monitoring loop!');
              clearInterval(this.txMonitorInterval);
              this.txMonitorInterval = null;
            }
          }
        });
      }, 500);
    } else {
      console.log('monitor is already polling');
    }
  }

  async voteProducer(voter: string, list: string[]): Promise<any> {
    if (list.length <= 30) {
      const currentVotes = list;
      currentVotes.sort();
      const info = await this.eos['getInfo']({}).then(result => {
        return result;
      });
      const broadcast_lib = info['last_irreversible_block_num'];
      return new Promise((resolve, reject) => {
        const cb = (err, res) => {
          if (err) {
            reject(JSON.parse(err));
          } else {
            console.log(res);
            setTimeout(() => {
              this.txCheckQueue.push({
                block: broadcast_lib,
                id: res['transaction_id']
              });
              this.startMonitoringLoop();
            }, 1000);
            resolve(res);
          }
        };
        this.agrio['voteproducer'](voter, '', currentVotes, cb);
      });
    } else {
      return new Error('Cannot cast more than 30 votes!');
    }
  }

  stake(account, amount) {
    return new Promise((resolve, reject) => {
      if (amount > 2) {
        const split = ((amount / 2) / 10000).toFixed(4);
        console.log(split);
        this.eos['delegatebw']({
          from: account,
          receiver: account,
          stake_net_quantity: split + ' AGR',
          stake_cpu_quantity: split + ' AGR',
          transfer: 0
        }, (err, result) => {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            console.log(result);
            resolve();
          }
        });
      } else {
        reject();
      }
    });
  }

  unstake(account, amount) {
    return new Promise((resolve, reject) => {
      this.eos['getAccount'](account).then((accountInfo) => {
        const current_stake = accountInfo['cpu_weight'] + accountInfo['net_weight'];
        if (current_stake - amount >= 10000) {
          const split = ((amount / 2) / 10000).toFixed(4);
          this.eos['undelegatebw']({
            from: account,
            receiver: account,
            unstake_net_quantity: split + ' AGR',
            unstake_cpu_quantity: split + ' AGR'
          }, (err, result) => {
            if (err) {
              console.log(err);
              reject(err);
            } else {
              console.log(result);
              resolve();
            }
          });
        } else {
          reject();
        }
      });
    });
  }

}
