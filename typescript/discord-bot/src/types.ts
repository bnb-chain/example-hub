export interface ChainConfig {
  rpc_wss_url: string;
  bnb_enable: boolean; //Enable BNB transfer monitoring
  contract_enable: boolean; //Enable BEP20 event monitoring
  bnb: MonitorFilter;
  contracts: TokenMonitorConfig[];
}

export interface MonitorFilter {
  froms: string[];
  tos: string[];
  min_value: number;
}

export interface TokenMonitorConfig extends MonitorFilter {
  address: string; //BEP20 Contract address
}

export interface AppConfig {
  bsc: ChainConfig;
  opbnb: ChainConfig;
  discord: {
    bot_token: string;
    channel_id: string;
  };
  csv_log: {
    enable: boolean; //Enable CSV logging
    path: string;
    bnb_logname: string;
    bep20_logname: string;
  };
}

export interface EventData {
  chainId: number;
  chainName: string;
  symbol: string; // 'BNB' or Token Symbol
  from: string;
  to: string;
  value: string; // Use string to preserve precision
  hash: string; // Transaction Hash
}
