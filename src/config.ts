import {environment} from './environments/environment';

export const localConfig = {
  "chains": [
    {
      "id": "41c4c54a375c767f11654a907541633bdddf158a8f0c394f657980bc484c91c9",
      "symbol": "AGR",
      "icon": "eos.png",
      "precision": 4,
      "name": "EOS MAINNET",
      "displayName": "Aggregion",
      "network": "MAINNET",
      "firstApi": "https://mainnet-amzn1.blockchain.aggregion.com",
      "historyApi": "https://api.eossweden.org/v2",
      "hyperionApis": [
        "https://api.eossweden.org/v2",
        "https://mainnet.eosn.io/v2"
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
      "endpoints": environment.production ?
          [
            {
              "url": "https://mainnet-amzn1.blockchain.aggregion.com",
              "owner": "aggregion",
              "latency": 0
            },
            {
              "url": "https://mainnet-node1.blockchain.aggregion.com",
              "owner": "aggregion",
              "latency": 0
            }
          ] :
          [
            {
              "url": "https://mainnet-node1.blockchain.aggregion.com",
              "owner": "aggregion",
              "latency": 0
            }
          ],
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
