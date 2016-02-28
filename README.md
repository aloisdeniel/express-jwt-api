# express-jwt-api

A small express server pre-configured for JWT authenticated api.

## Install

```sh
$ npm install -g express-jwt-api
```

## Quick start

```js
var jwtapi = require('express-jwt-api');

function authenticate(username,password,cb) {
	if(username === 'user' && password === '1234') cb(null, { username: username });
	else cb(new Error("Invalid credentials"));
};

var api = jwtapi({
	secret: 'secrettt',
	expiry: '30 days',
	authenticate: authenticate
});

api.get('/protected', function(req,res) { res.json({ isProtected: true }); });

api.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
```

## Usage

### jwtapi(opts)

Creates the express app with the preconfigured authentication routes and mecanisms.

`options`

* `secret`: The private key used to sign tokens.
* `authenticate`: A `function(username,password,callback<err,tokencontent>` for authenticating a user.
* `expiry` (optional): The expiry for tokens (default: no expiry).
* `loginPath` (optional): The path for login method (default: `/auth/login`).
* `publicPaths` (optional): An array containing all the unprotected path. The `loginPath` is automatically added to it.

## Copyright and license

MIT © [Aloïs Deniel](http://aloisdeniel.github.io)