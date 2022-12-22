# data-forge-indicators-ext

This is an extension of [data forge indicators](https://data-forge.github.io/data-forge-indicators/) with more indicators.

## OHLC Data
basically we follow the data format as in the following:
```json
{
    "open": xxx,
    "high": xxx,
    "low": xxx,
    "close": xxx,
    "date": "20220201",
    "time": 2021-12-01T14:00:00.000Z
}
```

Please note, in the OHLC data object, the date is a string type using the "YYYYMMDD" format, and the time is a "Date" type.

## Test Data
Sample gold data (year 2021 from: https://au.investing.com/commodities/gold-historical-data) is included for testing.

## Indicators

### EMA

This version of EMA fixes a calcuation bug in the original version.


### Chandelier Exit


### Donchian Channel


### Relative Strength (RS)

## Maintainer

[Eric Tang](https://twitter.com/_e_tang) @ [TYO Lab](http://tyo.com.au)
