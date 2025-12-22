export type RecipientInput = {
  address: string;
  amount: string;
};

export type StoredRecipient = RecipientInput & {
  amountWei: string;
};

export type BatchRecord = {
  id?: number;
  batch_id: string;
  metadata_uri: string;
  token: string;
  token_type: string;
  total_wei: string;
  human_total: string;
  recipient_count: number;
  tx_hash: string;
  payer: string;
  chain_id: number;
  created_at?: string;
  recipients?: StoredRecipient[];
};

export type ScheduleRecord = {
  id?: number;
  schedule_id: string;
  metadata_uri: string;
  token: string;
  token_type: string;
  total_wei: string;
  human_total: string;
  execute_after: string;
  payer: string;
  chain_id: number;
  recipients?: StoredRecipient[];
  executed?: boolean;
  executed_tx?: string;
  executed_at?: string;
  created_at?: string;
};
