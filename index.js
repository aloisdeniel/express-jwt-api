var express = require('express');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var uuid = require('node-uuid');

/**
 * Generates a JWT access token, but also a refresh token that
 * is inserted into store.
 * @param store The store used for generated refresh tokens.
 * @param user The public user data of the token.
 * @param opts The options : secret, expiry.
 * @param cb The callback (err,tokens) for the operation.
 */
function createToken(store,user,opts,cb) {
	var refresh_token = uuid.v4();
	var token = jwt.sign(user, opts.secret, {
		expiresIn: opts.expiry
	});
	
	store.set(refresh_token,user,function(err){
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

/**
 * Generates a new JWT access and refresh token from a valid refresh token.
 * @param store The store used for generated refresh tokens.
 * @param refresh_token The valid refresh token.
 * @param cb The callback (err,tokens) for the operation.
 */
function refreshToken(store,refresh_token,cb) {
	store.get(refresh_token,function(err,user){
		if(err) { 
			cb(err); 
			return; 
		}
		store.delete(refresh_token,function(err){
			if(err) { cb(err); return; }
			cb(null,user);
		});
	});
}

/**
 * The api object that contains stores and used to setup an express app.
 */
var JwtApi = function(opts) {
	
	if(!opts.secret) throw new Error("A secret key must be precised");
	if(!opts.authenticate) throw new Error("A user authentication function must be precised");
	
	var loginPath = opts.loginPath;
	var Store = opts.Store;
	
	if(!loginPath) loginPath = '/auth/login';
	if(!Store) Store = require('./store-nedb.js');
	
	var publicPaths = [loginPath];
	if(opts.publicPaths) publicPaths.concat(opts.public);
	
	var refresh_tokens = new Store("refresh_tokens");
	
	this.setup = function(app){
		
		if(!app) app = express();
		
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));
		app.use(expressJwt({ secret: opts.secret }).unless({path: publicPaths}));
		
		app.post(loginPath,function(req,res){
			var username = req.body.username;
			
			if(req.body && req.body.refresh_token)
			{
				refreshToken(refresh_tokens,req.body.refresh_token,function(err,user){
					if(err) res.status(500).json({ message: 'internal server error' });
					else if(!user) res.status(403).json({ message: 'invalid refresh_token' });
					else createToken(refresh_tokens,user,opts,function(err,token){
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
						createToken(refresh_tokens,user,opts,function(err,token){
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
};

module.exports = JwtApi;