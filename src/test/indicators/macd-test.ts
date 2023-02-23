import { assert, expect } from 'chai';
import 'mocha';
import * as dataForge from 'data-forge';
import { Series } from 'data-forge';
import { DataFrame } from 'data-forge';
import { WhichIndex } from 'data-forge/build/lib/series';
import "../../index";
import * as path from 'path';
import { data } from '../data'

describe('macd', () => {

    let macd: any = undefined;
    let last_macd: any;

    function compute_macd() {
        let df = new DataFrame({
            columnNames: ["pos", "value"],
            rows: data
        });

       const newseries = df.getSeries('value'); //setIndex('pos');

       macd = newseries.macd_e(4, 10, 2);
       last_macd = macd.last();
       return macd;
    }

    it('macd', async function () {

       if (macd === undefined) 
            compute_macd();
       
       const row: any = macd.at(4);
       let shortEma = row.shortEMA;

       //let new_df = df.withSeries('macd', new Series(macd.toArray()));
       expect(shortEma.toFixed(2)).to.equal('22.18');

       console.log("last macd:" + JSON.stringify(last_macd));

    });

    /**
     * @todo
     * 
     * add test for macd_e_update
     */
    it('macd-update', async function () {
        let df = new DataFrame({
            columnNames: ["pos", "value"],
            rows: data.slice(0, data.length - 1)
        });

        let last_row = data[data.length - 1];

        const newseries = df.getSeries('value'); //setIndex('pos');
 
        let newdf = df.withSeries("macd", new Series(newseries.macd_e(4, 10, 2).toArray()));

        let value_series = newdf.getSeries("value");
        newdf = newdf.withSeries("ema4", value_series.ema_e(4))
            .withSeries("ema10", value_series.ema_e(10));
        let newdf2 = newdf.appendPair([df.count(), { pos: last_row[0], value: last_row[1] }]);
        newdf2 = newdf2.macd_e_update(0, 1, { shortPeriod: 4, longPeriod: 10, signalPeriod: 2, key: "macd", value_key: "value" });
 
        let lm = newdf2.last().macd;

        if (macd === undefined)
            compute_macd();
        expect(lm.shortEMA.toFixed(2)).to.equal(last_macd.shortEMA.toFixed(2));
        expect(lm.longEMA.toFixed(2)).to.equal(last_macd.longEMA.toFixed(2));
        expect(lm.macd.toFixed(2)).to.equal(last_macd.macd.toFixed(2));
        expect(lm.signal.toFixed(2)).to.equal(last_macd.signal.toFixed(2));
        expect(lm.histogram.toFixed(2)).to.equal(last_macd.histogram.toFixed(2));
     });
});
