//
// Data access layer, does all MongoDB operations
// ----------------------------------------------
// Richard Bannister, June 2018 (Original Author = Ben Colemen, March 2018), June 2018
//

const utils = require('./utils');

class DataAccess {

  //
  // Initialize
  //
  constructor() {
    // Unlikely you'll ever want to change these, but you probably could
    this.DBNAME = 'ecomdiscorderDb';
    this.ORDER_COLLECTION = 'orders';

    this.MongoClient = require('mongodb').MongoClient;
  }

  //
  // Connect to MongoDB server, with retry logic
  //
  async connectMongo(connectionString, retries, delay) {
    let mongoErr
    let retry = 0;
    let mongoHost = require('url').parse(connectionString).host;

    while(true) {
      console.log(`### Connection attempt ${retry+1} to MongoDB server ${mongoHost}`)

      if(!this.db) {

        // Use await and connect to Mongo
        await this.MongoClient.connect(connectionString)
        .then(db => {
          // Switch DB to smilr, which will create it, if it doesn't exist
          this.db = db.db(this.DBNAME);
          console.log(`### Yay! Connected to MongoDB server`)
        })
        .catch(err => {
          mongoErr = err
        });
      }

      // If we don't have a db object, we've not connected - retry
      if(!this.db) {
        retry++;        
        if(retry < retries) {
          console.log(`### MongoDB connection attempt failed, retrying in ${delay} seconds`);
          await utils.sleep(delay * 1000);
          continue;
        }
      }
      
      // Return promise, if we have a db, resolve with it, otherwise reject with error
      return new Promise((resolve, reject) => {
        if(this.db) { resolve(this.db) }
        else { reject(err) }
      });
    }
  }

  //
  // Data access methods for order documents
  //

  queryOrders(query) {
    return this.db.collection(this.ORDER_COLLECTION).find(query).toArray();
  }

  getOrder(id) {
    return this.db.collection(this.ORDER_COLLECTION).findOne({_id: id})
  }

  deleteOrder(id) {
    return this.db.collection(this.ORDER_COLLECTION).deleteOne({_id: id})
  }

  // Used to both create and update orders. NOTE doUpsert=true is only used by demoData loading script
  createOrUpdateOrder(order, doUpsert) {
    if (order._id) {
      return this.db.collection(this.ORDER_COLLECTION).updateOne({_id: order._id}, {$set: order}, {upsert: doUpsert});
    } else {
      // Create a random short-code style id for new orders, 
      order._id = utils.makeId(5);
      return this.db.collection(this.ORDER_COLLECTION).insertOne(order);
    }
  }
}

// Create a singleton instance which is exported NOT the class 
const self = new DataAccess();
module.exports = self;