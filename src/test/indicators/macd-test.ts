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

    it('macd', async function () {

       let df = new DataFrame({
           columnNames: ["pos", "value"],
           rows: data
       });

       const newseries = df.getSeries('value'); //setIndex('pos');

       const macd = newseries.macd_e(4, 10, 2);
       const row: any = macd.at(4);
       let shortEma = row.shortEMA;

       let new_df = df.withSeries('macd', new Series(macd.toArray()));
       expect(shortEma.toFixed(2)).to.equal('22.18');

       // console.log(macd.merge(df).toString());

    });

    /**
     * @todo
     * 
     * add test for macd_e_update
     */
});
