var express = require('express');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var uuid = require('node-uuid');

/*
*  opts = 
*		(req) secret: undefined
*		(req) authenticate: function(username,password,cb<err,token>)
*		(opt) loginPath: '/auth/login'
*		(opt) publicPaths : [ '/auth/login' ]
* 		(opt) expiry :  undefined
*/

//Stored in memory
var renew_tokens = {};

function createToken(user,opts) {
	var renew_token = uuid.v4();
	renew_tokens[renew_token] = user;
	var token = jwt.sign(user, opts.secret, {
		expiresIn: opts.expiry
	});
	
	return { 
		token: token,
		renew_token: renew_token
	};
}

module.exports = function(opts) {
	
	if(!opts.secret) throw new Error("A secret key must be precised");
	if(!opts.authenticate) throw new Error("A user authentication function must be precised");
	
	var app = express();
	
	var loginPath = '/auth/login';
	if(opts.loginPath) loginPath = opts.loginPath;
	
	var publicPaths = [loginPath];
	if(opts.publicPaths) publicPaths.concat(opts.public);
	
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(expressJwt({ secret: opts.secret }).unless({path: publicPaths}));
	
	app.post(loginPath,function(req,res){
		var username = req.body.username;
		
		if(req.body && req.body.renew_token && renew_tokens[req.body.renew_token])
		{
			var user = renew_tokens[req.body.renew_token];
			delete renew_tokens[req.body.renew_token];
			var token = createToken(user,opts);
			res.json(token);
		}
		else if(req.body && username && req.body.password)
		{
			opts.authenticate(username,req.body.password,function(err,user) {
				if(err)
				{
					res.status(403).json({ message: 'invalid credentials' });
				}
				else
				{
					var token = createToken(user,opts);
					res.json(token);
				}
			});
		}
		else
		{
	    	res.status(403).json({ message: 'missing login or valid renew_token' });
		}
	});
	
	app.use(function (err, req, res, next) {
	  if (err.name === 'UnauthorizedError') {
	    res.status(401).json({ message: 'invalid token...' });
	  }
	});
	
	return app;
};