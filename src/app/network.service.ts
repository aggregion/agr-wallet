import {Injectable} from '@angular/core';
import {AccountsService} from './accounts.service';
import {AGRJSService} from './eosjs.service';
import {Router} from '@angular/router';

import * as Eos from '../assets/eos.js';
import {BehaviorSubject} from 'rxjs';

export interface Endpoint {
  url: string;
  owner: string;
  latency: number;
  filters: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  publicEndpoints: Endpoint[];
  eos: any;
  mainnetId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f';
  genesistx = 'c408b0b3ce1785e2f384cc2a15375b2b510f5dd4d428ba827b113c0b55a44408'; // Change
  voteref = 'c408b0b3ce1785e2f384cc2a15375b2b510f5dd4d428ba827b113c0b55a44408'; // Change
  txrefBlock = 14229;
  voterefBlock = 14229;
  baseConfig = {
    httpEndpoint: '',
    expireInSeconds: 60,
    broadcast: true,
    debug: false,
    sign: true,
    chainId: ''
  };
  validEndpoints: Endpoint[];
  status: string;
  connectionTimeout: any;
  selectedEndpoint = new BehaviorSubject<Endpoint>(null);
  networkingReady = new BehaviorSubject<boolean>(false);

  constructor(private eosjs: AGRJSService, private router: Router, public aService: AccountsService) {
    this.publicEndpoints = [
      {url: 'https://devnet.blockchain.aggregion.com', owner: 'Aggregion', latency: 0, filters: []}
    ];
    this.validEndpoints = [];
    this.status = '';
    this.connectionTimeout = null;
  }

  connect() {
    this.status = '';
    this.networkingReady.next(false);
    this.scanNodes().then(() => {
      this.verifyFilters().then(() => {
        this.extractValidNode();
      });
    });
    console.log('Starting timer...');
    this.startTimeout();
  }

  startTimeout() {
    this.connectionTimeout = setTimeout(() => {
      console.log('Timeout!');
      if (!this.networkingReady.getValue()) {
        this.status = 'timeout';
        clearTimeout(this.connectionTimeout);
        this.networkingReady.next(false);
        this.connectionTimeout = null;
      }
    }, 10000);
  }

  async scanNodes() {
    for (const apiNode of this.publicEndpoints) {
      await this.apiCheck(apiNode);
    }
  }

  extractValidNode() {
    console.warn('extractValidNode');
    for (const node of this.publicEndpoints) {
      if (node.filters.length === 2) {
        this.validEndpoints.push(node);
      }
    }
    this.selectEndpoint();
  }

  selectEndpoint() {
    console.warn('selectEndpoint');
    let latency = 2000;
    this.validEndpoints.forEach((node) => {
      if (node.latency < latency) {
        latency = node.latency;
        this.selectedEndpoint.next(node);
      }
    });
    if (this.selectedEndpoint.getValue() === null) {
      this.networkingReady.next(false);
    } else {
      console.log('Best Server Selected!', this.selectedEndpoint.getValue().url);
      this.startup(null);
    }
  }

  async verifyFilters() {
    for (const apiNode of this.publicEndpoints) {
      if (apiNode.latency > 0 && apiNode.latency < 1000) {
        await this.filterCheck(apiNode);
      }
    }
  }

  filterCheck(server: Endpoint) {
    console.log('Starting filter check for ' + server.url);
    const config = this.baseConfig;
    config.httpEndpoint = server.url;
    config.chainId = this.mainnetId;
    const eos = Eos(config);
    const pq = [];
    pq.push(new Promise((resolve1) => {
      eos['getTransaction'](this.genesistx, (err, txInfo) => {
        if (err) {
          console.log(err);
          resolve1();
        } else {
          if (txInfo['block_num'] === this.txrefBlock) {
            server.filters.push('agrio.token:transfer');
          } else {
            console.log('agrio.token:transfer filter is disabled on ' + server.url);
          }
          resolve1();
        }
      });
    }));
    pq.push(new Promise((resolve1) => {
      eos['getTransaction'](this.voteref, (err, txInfo) => {
        if (err) {
          console.log(err);
          resolve1();
        } else {
          if (txInfo['block_num'] === this.voterefBlock) {
            server.filters.push('agrio:voteproducer');
          } else {
            console.log('agrio:voteproducer filter is disabled on ' + server.url);
          }
          resolve1();
        }
      });
    }));
    return Promise.all(pq);
  }

  apiCheck(server: Endpoint) {
    console.log('Starting latency check for ' + server.url);
    return new Promise((resolve) => {
      const config = this.baseConfig;
      config.httpEndpoint = server.url;
      config.chainId = this.mainnetId;
      const eos = Eos(config);
      const refTime = new Date().getTime();
      const tempTimer = setTimeout(() => {
        server.latency = -1;
        resolve();
      }, 2000);
      try {
        eos['getInfo']({}, (err) => {
          if (err) {
            server.latency = -1;
          } else {
            server.latency = ((new Date().getTime()) - refTime);
            console.log(server.url, server.latency);
          }
          clearTimeout(tempTimer);
          resolve();
        });
      } catch (e) {
        server.latency = -1;
        resolve();
      }
    });
  }

  startup(url) {
    let endpoint = url;
    if (!url) {
      endpoint = this.selectedEndpoint.getValue().url;
    } else {
      this.status = '';
      this.networkingReady.next(false);
      this.startTimeout();
    }
    this.eosjs.init(endpoint, this.mainnetId).then((savedAccounts: any) => {
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.networkingReady.next(true);
        this.connectionTimeout = null;
      }
      if (savedAccounts) {
        if (savedAccounts.length > 0) {
          this.aService.loadLocalAccounts(savedAccounts);
          this.aService.initFirst();
          this.networkingReady.next(true);
          this.router['navigate'](['dashboard', 'wallet']);
        } else {
          console.log('No saved accounts!');
        }
      }
    }).catch(() => {
      this.networkingReady.next(false);
    });
  }

}
