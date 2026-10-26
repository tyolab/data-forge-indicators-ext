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
        let series = df.getSeries('open');
        let first = series.first();
        let series0 = df.getSeries('close');
        let last = series0.last();

        let series2 = df.getSeries('high');
        let series3 = df.getSeries('low');
        let max = series2.max();
        let min = series3.min();
        
        const df2 = df.compress(TimeFrame.Week);

        expect(df2.count()).to.equal(53);

        const df3 = df.compress(TimeFrame.Month);
        expect(df3.count()).to.equal(12);

        const df4 = df.compress(TimeFrame.Month_3);
        expect(df4.count()).to.equal(4);
        let bar1 = df4.first();
        let bar4 = df4.last();
        let bar3 = df4.at(2);
        let bar2 = df4.at(1);
        expect(bar1.open).to.equal(first);
        expect(bar4.close).to.equal(last);
        expect(bar1.high).to.equal(max);
        expect(bar3.low).to.equal(min);

        /**
         * "Apr 01, 2021","1,736.80","1,732.00","1,739.90","1,732.00","0.00K","0.75%"
         * "Jul 01, 2021","1,784.30","1,785.20","1,785.20","1,782.60","0.51K","0.28%"
"Jun 30, 2021","1,779.30","1,764.00","1,771.20","1,764.00","0.19K","0.47%"
"Oct 01, 2021","1,761.50","1,758.60","1,766.00","1,753.30","1.17K","0.10%"
"Sep 30, 2021","1,759.70","1,732.90","1,766.00","1,727.70","3.44K","1.93%"
         */
        expect(bar2.open).to.equal(1732.00);
        expect(bar2.close).to.equal(1779.30);
        expect(bar3.open).to.equal(1785.20);
        expect(bar3.close).to.equal(1759.70);
        expect(bar4.open).to.equal(1758.60);

        const df5 = df.compress(TimeFrame.Year);
        expect(df5.count()).to.equal(1);
        let bar = df5.first();

        expect(bar.high).to.equal(max);
        expect(bar.low).to.equal(min);

        expect(bar.open).to.equal(first);
        expect(bar.close).to.equal(last);
    });

    // ticks data with only bid and ask
    it('compress-minutes', async function () {
        this.timeout(30000);

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

/**
 * Volume must be conserved by compression (regression, 2026-10-26).
 *
 * The period-boundary branch used to do `row.volume += lastday.volume` on top of the loop's own
 * `row.volume += value.volume`, double-counting the FINAL bar of every period except the last (the
 * end-of-loop flush only re-assigns close, which is why the last period always looked right).
 * Observed on ASX BHP weeklies: the week of 15 Jun summed to 68,665,738 across its five daily bars
 * but reported 106,526,647 — exactly +37,860,909, the 19 Jun bar. OHLC was unaffected, so it only
 * ever showed up in volume-derived figures.
 */
describe('compress volume conservation', () => {

    const mk = (iso: string, v: number) => ({
        time: new Date(iso), open: 10, high: 11, low: 9, close: 10, volume: v,
    });

    it('weekly volume equals the sum of its daily bars', () => {
        const DataFrame = require('data-forge').DataFrame;
        // two full trading weeks, deliberately different volumes per day
        const days = [
            mk('2026-06-01T14:00:00Z', 1), mk('2026-06-02T14:00:00Z', 2), mk('2026-06-03T14:00:00Z', 4),
            mk('2026-06-04T14:00:00Z', 8), mk('2026-06-05T14:00:00Z', 16),
            mk('2026-06-08T14:00:00Z', 32), mk('2026-06-09T14:00:00Z', 64), mk('2026-06-10T14:00:00Z', 128),
            mk('2026-06-11T14:00:00Z', 256), mk('2026-06-12T14:00:00Z', 512),
        ];
        const weeks = (new DataFrame({ values: days }) as any).compress(TimeFrame.Week).bake().toArray();

        const daily_total = days.reduce((s, d) => s + d.volume, 0);
        const weekly_total = weeks.reduce((s: number, w: any) => s + (w.volume || 0), 0);
        // the invariant that the bug broke: compression redistributes volume, never creates it
        expect(weekly_total).to.equal(daily_total);

        // and no individual period may exceed the sum of all input volume
        for (const w of weeks)
            expect(w.volume).to.be.at.most(daily_total);

        // with powers of two, each week's volume identifies its members unambiguously
        expect(weeks.length).to.be.at.least(2);
        expect(weeks.map((w: any) => w.volume)).to.not.include(16 + 16);   // the old double-count
    });

    it('monthly volume equals the sum of its daily bars', () => {
        const DataFrame = require('data-forge').DataFrame;
        const days = [
            mk('2026-06-01T14:00:00Z', 5), mk('2026-06-15T14:00:00Z', 7), mk('2026-06-30T14:00:00Z', 11),
            mk('2026-07-01T14:00:00Z', 13), mk('2026-07-15T14:00:00Z', 17), mk('2026-07-31T14:00:00Z', 19),
        ];
        const months = (new DataFrame({ values: days }) as any).compress(TimeFrame.Month).bake().toArray();
        const daily_total = days.reduce((s, d) => s + d.volume, 0);
        const monthly_total = months.reduce((s: number, m: any) => s + (m.volume || 0), 0);
        expect(monthly_total).to.equal(daily_total);
    });
});
