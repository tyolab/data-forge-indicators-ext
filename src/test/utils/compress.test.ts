import { assert, expect } from 'chai';
import 'mocha';
import 'data-forge-fs';
import "../../index";
import * as path from 'path';

import { gold_dataframe, load_gold_ticks_data } from '../data';
import { TimeFrame } from '../../utils/compress';

describe('compress', () => {

    it('compress', async function () {
        const df = gold_dataframe;
            
        // const df = origdf
        //     .withSeries('time', origdf.getSeries('date').select(d => {
        //         var parts = d.split("/");
        //         return new Date(parseInt(parts[2], 10),
        //         parseInt(parts[1], 10) - 1,
        //         parseInt(parts[0], 10));
        //     }))
        //     .parseDates('time', "DD/MM/YYYY"); // didn't work
        //     ;
        
        const df2 = df.compress(TimeFrame.Week);
        const series2 = df2.getSeries('close');

        expect(df2.count()).to.equal(53);

        const df3 = df.compress(TimeFrame.Month);
        expect(df3.count()).to.equal(12);
    });

    // ticks data with only bid and ask
    it('compress-minutes', async function () {
        this.timeout(20000);

        const df = await load_gold_ticks_data();
        expect(df.count()).to.equal(222468);

        let dataframe = df.compressMinutes(TimeFrame.Minute_1, TimeFrame.Tick);
        let first_minute = dataframe.first();
        expect(first_minute.open.toFixed(3)).to.equal('1904.998');
        expect(first_minute.close.toFixed(3)).to.equal('1910.452');

        let df_3m = dataframe.compressMinutes(TimeFrame.Minutes_3, TimeFrame.Minute_1);
        let first_3m = df_3m.first();
        expect(first_3m.open.toFixed(3)).to.equal('1904.998');
        expect(first_3m.close.toFixed(3)).to.equal('1911.152');

        let df_15m = df.compressMinutes(TimeFrame.Minutes_15, TimeFrame.Minutes_3);
        let first_15m = df_15m.first();
        expect(first_15m.open.toFixed(3)).to.equal('1904.998');
        expect(first_15m.close.toFixed(3)).to.equal('1909.352');

        let df_1h = df.compressMinutes(TimeFrame.Hour_1, TimeFrame.Minutes_15);
        let first_1h = df_1h.first();
        expect(first_1h.open.toFixed(3)).to.equal('1904.998');
        expect(first_1h.close.toFixed(3)).to.equal('1913.575');

        let df_4h = df.compressMinutes(TimeFrame.Hours_4, TimeFrame.Hour_1);
        let first_4h = df_4h.first();
        expect(first_4h.open.toFixed(3)).to.equal('1904.998');
        expect(first_4h.close.toFixed(3)).to.equal('1922.042');
    });

    // when we have the tick data with last trade price and volume
    // it('compress-ticks', async function () {

    // });

});
