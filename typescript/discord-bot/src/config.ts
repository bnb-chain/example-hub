import { AppConfig } from './types.js';

const config: AppConfig = {
  bsc: {
    bnb_enable: true, //Enable BNB transfer monitoring
    contract_enable: true, //nable BEP20 event monitoring
    rpc_wss_url: '', //BSC WebSocket RPC Node URL
    bnb: {
      froms: [],
      tos: [],
      min_value: 0.001,
    },
    contracts: [ //BEP20 Contract: [{address:'', from:[], tos:[], min_value:0}]
      {
        address: '0x55d398326f99059ff775485246999027b3197955', //USDT
        froms: [],
        tos: [],
        min_value: 0,
      }
    ]
  },
  opbnb: {
    bnb_enable: true, //Enable BNB transfer monitoring
    contract_enable: true, //nable BEP20 event monitoring
    rpc_wss_url: '',//opBNB WebSocket RPC Node URL
    bnb: {
      froms: [],
      tos: [],
      min_value: 0.001,
    },
    contracts: [ //BEP20 Contract: [{address:'', from:[], tos:[], min_value:0}]
      {
        address: '0x9e5aac1ba1a2e6aed6b32689dfcf62a509ca96f3', //USDT
        froms: [],
        tos: [],
        min_value: 0,
      }
    ]
  },
  discord: {
    bot_token: '',//Discord bot token
    channel_id: ''//Discord channelId
  },
  csv_log: {
    enable: true, //Enable CSV logging
    path: './logs/',
    bnb_logname: 'bnb.csv',
    bep20_logname: 'bep20.csv'
  }
};

export default config;
