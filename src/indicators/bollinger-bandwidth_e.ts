import { ISeries, Series, DataFrame, IDataFrame } from "data-forge";

declare module "data-forge/build/lib/series" {
    interface Series<IndexT, ValueT> {
        bandwidth_e(): ISeries<IndexT, number>;
        bandwidth_p(): ISeries<IndexT, number>;
    }

    interface ISeries<IndexT, ValueT> {
        bandwidth_e(): ISeries<IndexT, number>;
        bandwidth_p(): ISeries<IndexT, number>;
    }
}

/**
 * Compute the bandwidth indicator from Bollinger Bands.
 * 
 *
 */
function bandwidth_p<IndexT = any>(this: ISeries<IndexT, any>): ISeries<IndexT, number> {
    return this.select(
        (bb) => {
            if (!bb)
                return 0;
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
function bandwidth_e<IndexT = any>(this: ISeries<IndexT, any>): ISeries<IndexT, number> {
    return this.select(
        (bb) => {
            if (!bb)
                return 0;

            let band = bb.bollinger || bb.bb || bb;
            return (band.upper - band.lower);
        }
        );
};

Series.prototype.bandwidth_p = bandwidth_p;
Series.prototype.bandwidth_e = bandwidth_e;