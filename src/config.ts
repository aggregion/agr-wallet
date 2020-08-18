import {environment} from './environments/environment';

export const localConfig = {
  "chains": [
    {
      "id": environment.production ? "6d2cd42cb31c1440e4601a7d557082f6642196792b247eab1350e64da48000b3" : "b3b5cc8cbf011f851f77831a31c2d1fc55de8ff677035a5e8ef16c84fa8fa93d",
      "symbol": "AGR",
      "icon": "aggr.png",
      "precision": 4,
      "name": "EOS MAINNET",
      "displayName": "Aggregion",
      "network": "MAINNET",
      "firstApi": environment.production ? "https://mainnet-amzn1.blockchain.aggregion.com" : "http://185.137.232.118:9999",
      // "historyApi": "https://api.eossweden.org/v2",
      "historyApi": "",
      "hyperionApis": [
        // "https://api.eossweden.org/v2",
        // "https://mainnet.eosn.io/v2"
      ],
      "forumTally": "https://s3.amazonaws.com/api.eosvotes.io/eosvotes/tallies/latest.json",
      "eosrioBP": "eosriobrazil",
      "proxyRegistry": "regproxyinfo",
      "lastNode": "",
      "logoSrc": "",
      "backdrop": "",
      "features": {
        "history": true,
        "send": true,
        "resource": true,
        "vote": true,
        "staking": true,
        "dapps": true,
        "addAcc": true,
        "newAcc": true,
        "forum": true,
        "rex": true
      },
      "system": [
        "eosio",
        "eosio.token",
        "eosio.msig",
        "eosio.forum"
      ],
      "endpoints": environment.production ? [
        {
          "url": "https://mainnet-amzn1.blockchain.aggregion.com",
          "owner": "aggregion",
          "latency": 0
        }
      ] : [
        {
          "url": "http://185.137.232.118:9999",
          "owner": "aggregion",
          "latency": 0
        },
      ],
      // "endpoints": environment.production ?
      //     [
      //       {
      //         "url": "185.137.232.118:9999",
      //         "owner": "aggregion",
      //         "latency": 0
      //       },
      //       {
      //         "url": "https://mainnet-node1.blockchain.aggregion.com",
      //         "owner": "aggregion",
      //         "latency": 0
      //       }
      //     ] :
      //     [
      //       {
      //         "url": "https://mainnet-node1.blockchain.aggregion.com",
      //         "owner": "aggregion",
      //         "latency": 0
      //       }
      //     ],
      "explorers": [
        {
          "name": "Aggregion.com",
          "account_url": "https://explorer.blockchain.aggregion.com/accounts/",
          "tx_url": "https://explorer.blockchain.aggregion.com/transactions/"
        },
      ],
      "exchanges": {
        "bitfinexdep1": {
          "memo_size": 16,
          "pattern": "^[a-f0-9]+$"
        },
        "krakenkraken": {
          "memo_size": 10,
          "pattern": "^[0-9]+$"
        },
        "binancecleos": {
          "memo_size": 9,
          "pattern": "^[0-9]+$"
        },
        "huobideposit": {
          "pattern": "^[0-9]+$"
        },
        "poloniexeos1": {
          "memo_size": 16,
          "pattern": "^[a-f0-9]+$"
        },
        "gateiowallet": {
          "memo_size": 16,
          "pattern": "^[a-f0-9]+$"
        },
        "chainceoneos": {
          "memo_size": 10,
          "pattern": "^[a-z]+$"
        },
        "zbeoscharge1": {
          "memo_size": 18,
          "pattern": "^[0-9]+$"
        },
        "okbtothemoon": {
          "pattern": "^[0-9]+$"
        },
        "eosusrwallet": {
          "memo_size": 36,
          "pattern": "^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$"
        }
      }
    },
  ]
}
