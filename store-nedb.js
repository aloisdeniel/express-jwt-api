var Datastore = require('nedb')

module.exports = function(name) {
	this.db = new Datastore({ filename: './' + name + '.store', autoload: true });
	
	this.set = function(key,value,cb){
		var entry = { key: key, value: value };
		this.db.insert(entry,cb);	
	};
	
	this.get = function(key,cb){
		this.db.findOne({ key: key }, function (err, entry) {
			if(err) {
				cb(err);
				return;
			}
			if(entry) cb(null,entry.value);
			else cb();
		});
	};
	
	this.delete = function(key,cb){
		this.db.remove({ key: key }, {}, cb);
	};
};