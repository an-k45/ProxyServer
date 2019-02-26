const express    = require("express"),
      app        = express(),
      request    = require("request"),
      validator  = require("validator"),
      timeout    = require('connect-timeout'),
      bodyParser = require("body-parser");

// CONFIG
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(timeout('60s'));
app.use(haltOnTimedout);

// ROUTING
app.all("/proxy/*", (req, res) => {
  if (!validator.isURL(req.params[0])) {
    res.status(400).send("400: invalid URL\n");
  } else if (req.method != "GET" && req.method != "POST") {
    res.status(501).send("501: method not supported\n");
  }

  delete req.headers.host;
  const options = getOptions(req);

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      for (let header in response.headers) {
        res.set(header, response.headers[header]);
      }
      if (req.method == "POST") JSON.parse(body);
      res.send(body);
    } else {
      res.status(response.statusCode).send(`${ response.statusCode }: ${ error }\n`);
    }
  };

  if (req.method == "GET") {
    request(options, callback);
  } else {
    request.post(options, callback);
  }
});

// Confirms server being online
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Our app is running on port ${ PORT }`);
});

/**
 * Return the options so as to make a call through request.
 * @param  {object} req The information of the request made.
 * @return {object}     The parsed options to make a proxied request.
 */
function getOptions(req) {
  const URL = req.params[0];
  const options = {
    url: URL,
    headers: req.headers,
    encoding: null
  }
  if (req.method == "POST") options["form"] = req.body;

  return options
};

function haltOnTimedout(req, res, next) {
  if (!req.timedout) next()
};
