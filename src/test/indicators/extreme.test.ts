import { assert, expect } from 'chai';
import 'mocha';
import * as dataForge from 'data-forge';
import 'data-forge-fs';
import { Series } from 'data-forge';
import { DataFrame } from 'data-forge';
import { WhichIndex } from 'data-forge/build/lib/series';
import "../../index";
import * as path from 'path';

import { gold_dataframe } from '../data';

describe('extreme', () => {

    // const df = dataForge.readFileSync(__dirname + "/../data/gold.csv")
    // .parseCSV()
    // .renameSeries({'Date': 'date'})
    // .renameSeries({'Price': 'close'})
    // .renameSeries({'High': 'high'})
    // .renameSeries({'Open': 'open'})
    // .renameSeries({'Low': 'low'});

    const df = gold_dataframe;

    it('extreme-highest', async function () {
        const max_day = df.highest(364);
        let max = Math.max(max_day.high, max_day.open, max_day.close);
        expect(max).to.equal(1977.6);
    });

    it('extreme-lowest', async function () {
        const min_day = df.lowest(364);
        let min = Math.min(min_day.low, min_day.open, min_day.close);
        expect(min_day.low).to.equal(1682.4);
    });

});
