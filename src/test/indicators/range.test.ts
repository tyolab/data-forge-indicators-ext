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

describe('range', () => {

    it('range', async function () {

        let series = gold_dataframe.range_e();

        let last_two = gold_dataframe.tail(2);
        let last1 = last_two.first();
        let last2 = last_two.last();

        let range = computeRange(last1, last2);

        expect(range).to.equal(series.last());
    });

});
