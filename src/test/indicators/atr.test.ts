import { assert, expect } from 'chai';
import 'mocha';
import * as dataForge from 'data-forge';
import { Series } from 'data-forge';
import { DataFrame } from 'data-forge';
import { WhichIndex } from 'data-forge/build/lib/series';
import "../../index";
import * as path from 'path';
import { gold_dataframe } from '../data';

import { computeRange as computeRange } from '../../indicators/utils';

describe('atr', () => {

    it('atr', async function () {

        let last = gold_dataframe.last();
        let series = gold_dataframe.atr(20);
        
        let new_df = gold_dataframe.take(gold_dataframe.count() - 1);

        expect(new_df.count() + 1).to.equal(gold_dataframe.count());

        new_df = new_df.appendPair([new_df.count(), last]);
        new_df = new_df.atr_update(20, 1, {});

        let new_last = new_df.last();
        let old_last = series.last();

        expect(new_last.atr.avg).to.equal(old_last.avg);
    });

    it('atr-with-range', async function () {

        let last = gold_dataframe.last();
        let range_series = gold_dataframe.range_e();
        let series = gold_dataframe.atr(20);

        delete last.atr;
        
        let new_df = gold_dataframe
            .withSeries('range', range_series)
            .withSeries('atr', series)
            .take(gold_dataframe.count() - 1);

        new_df = new_df.appendPair([new_df.count(), last]);
        new_df.range_e_update(1, {});
        new_df.atr_update(20, 1, {});

        let new_last = new_df.last();
        let old_last = series.last();

        expect(new_last.atr.avg).to.equal(old_last.avg);
    });

});
