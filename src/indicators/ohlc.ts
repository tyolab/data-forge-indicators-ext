/**
 * Prices for period of time (a bar of data).
 */
export interface OHLC {
    time: Date; // the date of the bar
    open: number;
    high: number;
    low: number;
    close: number;
}