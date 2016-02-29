var express = require('express');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var uuid = require('node-uuid');
var DefaultStore = require('./store-nedb.js');

/*
*  opts = 
*		(req) secret: undefined
*		(req) authenticate: function(username,password,cb<err,token>)
*		(opt) loginPath: '/auth/login'
*		(opt) publicPaths : [ '/auth/login' ]
* 		(opt) expiry :  undefined
*/

var refresh_tokens = new DefaultStore("refresh_tokens");

function createToken(user,opts,cb) {
	var refresh_token = uuid.v4();
	var token = jwt.sign(user, opts.secret, {
		expiresIn: opts.expiry
	});
	
	refresh_tokens.set(refresh_token,user,function(err){
		if(err) {
			cb(err);
			return;
		}
		
		cb(null,{ 
			access_token: token,
			refresh_token: refresh_token
		});
	});
}

function refreshToken(refresh_token,cb) {
	refresh_tokens.get(refresh_token,function(err,user){
		if(err) { cb(err); return; }
		refresh_tokens.delete(refresh_token,function(err){
			if(err) { cb(err); return; }
			cb(null,user);
		});
	});
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
		
		if(req.body && req.body.refresh_token)
		{
			refreshToken(req.body.refresh_token,function(err,user){
				if(err) res.status(500).json({ message: 'internal server error' });
				else if(!user) res.status(403).json({ message: 'invalid refresh_token' });
				else createToken(user,opts,function(err,token){
					if(err) res.status(500).json({ message: 'internal server error' });
					else res.json(token);
				});
			});
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
					createToken(user,opts,function(err,token){
						if(err) res.status(500).json({ message: 'internal server error' });
						else res.json(token);
					});
				}
			});
		}
		else
		{
	    	res.status(403).json({ message: 'missing login or password' });
		}
	});
	
	app.use(function (err, req, res, next) {
	  if (err.name === 'UnauthorizedError') {
	    res.status(401).json({ message: 'invalid token...' });
	  }
	});
	
	return app;
};