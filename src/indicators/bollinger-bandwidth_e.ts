import { ISeries, Series, DataFrame, IDataFrame } from "data-forge";
import { IBollingerBand } from "./bollinger_e";

declare module "data-forge/build/lib/dataframe" {
    interface IDataFrame<IndexT, ValueT> {
        bandwidth_e(): ISeries<IndexT, number>;
        bandwidth_p(): ISeries<IndexT, number>;
    }

    interface DataFrame<IndexT, ValueT> {
        bandwidth_e(): ISeries<IndexT, number>;
        bandwidth_p(): ISeries<IndexT, number>;
    }
}

/**
 * Compute the bandwidth indicator from Bollinger Bands.
 * 
 *
 */
function bandwidth_p<IndexT = any>(this: IDataFrame<IndexT, any>): ISeries<IndexT, number> {
    return this.deflate(
        (bb) => {
            let band = bb.bollinger || bb.bb || bb;
            return (band.upper - band.lower) / (band.middle);
        }
        );
};

/**
 * 
 * Really just the bandwidth without normalization.
 * 
 * @param this 
 * @returns 
 */
function bandwidth_e<IndexT = any>(this: IDataFrame<IndexT, any>): ISeries<IndexT, number> {
    return this.deflate(
        (bb) => {
            let band = bb.bollinger || bb.bb || bb;
            return (band.upper - band.lower);
        }
        );
};

DataFrame.prototype.bandwidth_p = bandwidth_p;
DataFrame.prototype.bandwidth_e = bandwidth_e;