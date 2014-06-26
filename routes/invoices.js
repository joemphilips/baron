/* jshint node: true */
'use strict';

var db = require(__dirname + '/../db');
var config = require(__dirname + '/../config');
var invoiceRouteUtil = require(__dirname + '/utils/invoices');

var invoices = function(app) {
  
  // View Invoice by ID
  app.get('/invoices/:invoiceId', function(req, res) {
    var invoiceId = req.params.invoiceId;
    invoiceRouteUtil.findInvoiceAndPaymentHistory(invoiceId, function(err, invoice) {
      if (err) {
        return res.render('error', { appTitle: config.appTitle, errorMsg: err.message });
      }
      else {
        if (!invoice.title) {
          invoice.title = config.appTitle;
        }
        return res.render('invoice', invoice);
      }
    });
  });

  // Post invoice object to /invoice to create new invoice
  app.post('/invoices', function(req, res) {
    var invoice = req.body;
    if (!invoice.api_key || invoice.api_key && invoice.api_key !== config.baronAPIKey) {
      var err = new Error('Access Denied: Invalid API key.');
      console.log(req.ip + ' attempted to create an invoice with an invalid API key.');
      res.status(401).write(err.message);
      res.end();
    }
    else {
      db.createInvoice(req.body, function(err, invoiceData) {
        if(err) {
          console.log(req.ip + ' createInvoice err: ' + require('util').inspect(err));
          res.status(400).write(err.message + '\n' + JSON.stringify(invoice));
          res.end();
        }
        else {
          console.log('Invoice ' + invoiceData.id + ': submitted by ' + req.ip);
          res.json(invoiceData);
        }
      });
    }
  });

  // Post api_key to /invoices/:invoiceId/void to void an invoice
  app.post('/invoices/:invoiceId/void', function(req, res) {
    var invoiceId = req.params.invoiceId;
    var apiKey = req.body.api_key;
    if (!apiKey || apiKey && apiKey !== config.baronAPIKey) {
      var err = new Error('Access Denied: Invalid access token.');
      console.log(req.ip + ' attempted to void an invoice with an invalid access token.');
      res.status(401).write(err.message);
      res.end();
    }
    else {
      invoiceRouteUtil.findInvoiceAndPaymentHistory(invoiceId, function(err, invoice, origInvoice) {
        if (err) {
          res.status(400).write(err.message + '\nAPI KEY: ' + apiKey + '\nInvoice ID: ' + invoiceId);
          res.end();
        }
        else if (invoice.is_void) {
          res.status(200).write('Invoice ' + invoiceId + ' is already void.');
          res.end();
        }
        else if (Number(invoice.total_paid) > 0) {
          res.status(400).write('Invoice ' + invoiceId + ' has payments, cannot be void.');
          res.end();
        }
        else {
          origInvoice.is_void = true;
          db.insert(origInvoice, function(err) {
            if (err) {
              res.status(400).write(err.message + '\nAPI KEY: ' + apiKey + '\nInvoice ID: ' + invoiceId);
              res.end();
            }
            else {
              res.status(200).write('Invoice ' + invoiceId + ' has been void.');
              res.end();
            }
          });
        }
      });
    }
  });

};

module.exports = invoices;
