// OHLCV type definition for cryptocurrency market data
export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Bollinger Bands result type
export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

// MACD result type
export interface MACD {
  MACD: number;
  signal: number;
  histogram: number;
}

// Trading signal data type
export interface TradingSignalData {
  asset: string;
  position: "long" | "short";
  entry: number;
  target: number;
  stopLoss: number;
  confidence: number;
}

// Analysis result type
export interface AnalysisResult {
  text: string;
  json: TradingSignalData | null;
}
