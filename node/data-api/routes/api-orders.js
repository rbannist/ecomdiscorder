//
// Routing controllers for the order API
// ----------------------------------------------
// Richard Bannister, June 2018 (Original Author = Ben Colemen, March 2018)
//

const express = require('express');
const routes = express.Router();
const utils = require('../lib/utils');

//
// GET orders - return array of orders; with status filter (active and completed)
//
routes
.get('/api/orders/status/:status', function (req, res, next) {
  res.type('application/json');
  let status = req.params.status;
  let active = "active";
  let completed = "completed";
  
  switch(status) {
    case 'active': 
        res.app.get('data').queryOrders({$and: [{status: active}]})
        .then(data => utils.sendData(res, data))
        .catch(err => utils.sendError(res, err));
      break;
    case 'completed': 
        res.app.get('data').queryOrders({status: completed})
        .then(data => utils.sendData(res, data))
        .catch(err => utils.sendError(res, err));
      break;
    default:
      // If status not valid
      utils.sendError(res, {msg:'Error. Supplied status not valid, must be one of: [active or completed]'}, 400);   
  }
})

//
// GET orders - return array of orders; with time range filter (today and past)
//
routes
.get('/api/orders/time/:time', function (req, res, next) {
  res.type('application/json');
  let time = req.params.time;
  let today = new Date().toISOString().substring(0, 10);
  
  switch(time) {
    case 'today': 
      res.app.get('data').queryOrders({$and: [{date: today}]})
        .then(data => utils.sendData(res, data))
        .catch(err => utils.sendError(res, err));
      break;
    case 'past': 
      res.app.get('data').queryOrders({date: {$lt: today}})
        .then(data => utils.sendData(res, data))
        .catch(err => utils.sendError(res, err));
      break;
    default:
      // If time not valid
      utils.sendError(res, {msg:'Error. Supplied time not valid, must be one of: [today or past]'}, 400);   
  }
})

//
// GET orders - return array of all orders
//
routes
.get('/api/orders', function (req, res, next) {
  res.type('application/json');
  res.app.get('data').queryOrders({})
    .then(data => {   
      if(!data) utils.sendData(res, [])
      else utils.sendData(res, data)
    })
    .catch(err => { utils.sendError(res, err) })
})

//
// GET order - return a single order by ID
//
routes
.get('/api/orders/:id', function (req, res, next) {
  res.type('application/json');
  res.app.get('data').getOrder(req.params.id)
    .then(data => {
      // Return 404 if data empty
      if(!data) utils.sendError(res, {msg: `Order with id '${req.params.id}' not found`}, 404)
      // Otherwise return the order data
      else utils.sendData(res, data)
    })
    .catch(err => { utils.sendError(res, err) })
})

//
// POST order - create a new order, call with order body with no id
//
routes
.post('/api/orders', function (req, res, next) {
  if(!utils.verifyCode(req.headers['x-secret'])) { utils.sendError(res, {msg: "Supplied x-secret code not valid"}, 401); return; }

  res.type('application/json');
  let order = req.body;

  if(order._id || order.id) utils.sendError(res, {msg: "Should not POST orders with id"}, 400);

  // We send back the new record, which has the new id
  res.app.get('data').createOrUpdateOrder(order, false)
    .then(data => utils.sendData(res, data.ops[0]))
    .catch(err => utils.sendError(res, err));
})

//
// PUT order - update an existing order, call with order body with id
//
routes
.put('/api/orders', function (req, res, next) {
  if(!utils.verifyCode(req.headers['x-secret'])) { utils.sendError(res, {msg: "Supplied x-secret code not valid"}, 401); return; }

  res.type('application/json');
  let order = req.body;

  // IMPORTANT! We munge and swap the _id and id fields so it matches MonogDB
  order._id = order.id;
  delete(order.id);

  if(!order._id) utils.sendError(res, {msg: "Should not PUT orders without id"}, 400);

  // Note we send back the same order object we receive, Monogo doesn't return it
  res.app.get('data').createOrUpdateOrder(order, false)
    .then(data => {
      if(data.result.n == 0) {
        utils.sendError(res, {msg: `No order with id ${order._id} found to modify`}, 404);
        return;
      }
      utils.sendData(res, order);
    })
    .catch(err => utils.sendError(res, err));
})

//
// DELETE order - delete single order by ID
//
routes
.delete('/api/orders/:id', function (req, res, next) {
  if(!utils.verifyCode(req.headers['x-secret'])) { utils.sendError(res, {msg: "Supplied x-secret code not valid"}, 401); return; }

  res.type('application/json');
  res.app.get('data').deleteOrder(req.params.id)
    .then(data => {
      if(data.deletedCount == 0) utils.sendError(res, {msg: `No order with id ${req.params.id} found to delete`}, 404);
      else utils.sendData(res, {msg: `Deleted doc ${req.params.id} ok`})
    })
    .catch(err => utils.sendError(res, err));
})

module.exports = routes;