import * as Witnet from "witnet-requests"

// Retrieves USD price of a bitcoin from the Binance API
const binance = new Witnet.Source("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
  .parseJSONMap()         // Parse a `Map` from the retrieved `String`
  .getFloat("price")      // Get the `Float` value associated to the `last` key

// Retrieves USD price of a bitcoin from the Kraken API
// The JSON here is a bit more complex, thus more operators are needed
const kraken = new Witnet.Source("https://api.kraken.com/0/public/Ticker?pair=BTCUSD")
  .parseJSONMap()         // Parse a `Map` from the retrieved `String`
  .getMap("result")       // Get the `Map` value associated to the `result` key
  .getMap("XXBTZUSD")     // Get the `Map` value associated to the `XXBTZUSD` key
  .getArray("a")          // Get the `Array` value associated to the `a` key
  .getFloat(0)            // Get the `Float` value at index `0`

// Filters out any value that is more than 1.5 times the standard
// deviationaway from the average, then computes the average mean of the
// values that pass the filter.
const aggregator = new Witnet.Aggregator({
  filters: [
   [Witnet.Types.FILTERS.deviationStandard, 1.5]
  ],
  reducer: Witnet.Types.REDUCERS.averageMean
})

// Filters out any value that is more than 1.5 times the standard
// deviationaway from the average, then computes the average mean of the
// values that pass the filter.
const tally = new Witnet.Tally({
  filters: [
   [Witnet.Types.FILTERS.deviationStandard, 1.5]
  ],
  reducer: Witnet.Types.REDUCERS.averageMean
})

const request = new Witnet.Request()
  .addSource(binance)           // Use source 1
  .addSource(kraken)            // Use source 2
  .setAggregator(aggregator)    // Set the aggregation script
  .setTally(tally)              // Set the tally script
  .setQuorum(25)                // Set witnesses count
  .setFees(1000000, 1000000)    // Set economic incentives (e.g. witness reward: 1 mWit, commit/reveal fee: 1 mWit)
  .setCollateral(10000000000)   // Set collateral (e.g. 10 Wit)

// Do not forget to export the request object
export { request as default }