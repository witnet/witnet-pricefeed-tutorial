import * as Witnet from "witnet-requests"

// Retrieves USD price of a bitcoin from the BitStamp API
const bitstamp = new Witnet.Source("https://www.bitstamp.net/api/ticker/")
  .parseJSON() // Parse the string, which you now to be JSON-encoded
  .asMap()     // Treat that as a Javascript object
  .get("last") // Get the value associated to the `last` key
  .asFloat()   // Treat that as a floating point number

// Retrieves USD price of a bitcoin from CoinDesk's "bitcoin price index" API
// The JSON here is a bit more complex, thus more operators are needed
const coindesk = new Witnet.Source("https://api.coindesk.com/v1/bpi/currentprice.json")
  .parseJSON()       // Parse the string, which you now to be JSON-encoded
  .asMap()           // Treat that as a Javascript object
  .get("bpi")        // Get the value associated to the `bpi` key
  .asMap()           // Treat that as a Javascript object
  .get("USD")        // Get the value associated to the `USD` key
  .asMap()           // Treat that as a Javascript object
  .get("rate_float") // Get the value associated to the `rate_float` key
  .asFloat()         // Treat that as a floating point number

// Computes the average mean of the two sources using a reducer
const aggregator = new Witnet.Aggregator([bitstamp, coindesk]) // Create a new aggregation
  .reduce(Witnet.Types.REDUCERS.averageMean)    // Reduce the input `Array` using the average mean

// Computes the average mean of the values reported by multiple nodes using a reducer
const tally = new Witnet.Tally(aggregator)          // Create a new tally function
  .reduce(Witnet.Types.REDUCERS.averageMean) // Reduce the input `Array` using the average mean

// This is the Witnet.Request object that needs to be exported
const request = new Witnet.Request()
  .addSource(bitstamp)       // Use source 1
  .addSource(coindesk)       // Use source 2
  .setAggregator(aggregator) // Set the aggregation script
  .setTally(tally)           // Set the tally script
  .setQuorum(4, 2, 3)        // Set witness count
  .setFees(10, 1, 1, 1)      // Set economic incentives
  .schedule(0)               // Make this request immediately solvable

// Do not forget to export the request object
export { request as default }
