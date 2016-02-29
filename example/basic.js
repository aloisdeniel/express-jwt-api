var JwtApi = require('../');

function authenticate(username,password,cb) {
	if(username === 'user' && password === '1234') cb(null, { username: username });
	else cb(new Error("Invalid credentials"));
};

var api = new JwtApi({
	secret: 'secrettt',
	expiry: '10 days',
	authenticate: authenticate
}).setup();

api.get('/protected', function(req,res) { res.json({ isProtected: true }); });

api.listen(3000, function () { console.log('Example app listening on port 3000!'); });