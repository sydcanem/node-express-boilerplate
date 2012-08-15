module.exports = function Server(expressInstance, sessionStore, siteConf) {
	var parseSignedCookie = require('connect').utils.parseSignedCookie;
	var io = require('socket.io').listen(expressInstance);
	var cookie = require('cookie');

	io.configure(function () {
		io.set('log level', 0);
	});

	io.set('authorization', function(handshakeData, ack) {
		var cookies = parseSignedCookie(cookie.parse(decodeURIComponent(handshakeData.headers.cookie)), siteConf.sessionSecret);
		sessionStore.get(cookies['connect.sid'], function(err, sessionData) {
			handshakeData.session = sessionData || {};
			handshakeData.sid = cookies['connect.sid']|| null;
			ack(err, err ? false : true);
		});
	});

	io.sockets.on('connection', function(client) {
		var user = client.handshake.session.user ? client.handshake.session.user.name : 'UID: '+(client.handshake.session.uid || 'has no UID');

		// Join user specific channel, this is good so content is send across user tabs.
		client.join(client.handshake.sid);

		client.send('welcome: '+user);

		client.once('message', function(msg) {
			// Send back the message to the users room.
			io.sockets.in(client.handshake.sid).send('socket.io relay message "'+msg+'" from: '+ user +' @ '+new Date().toString().match(/[0-9]+:[0-9]+:[0-9]+/));
		});

		client.on('disconnect', function() { console.log('disconnect'); });
	});

	io.sockets.on('error', function(){ console.log(arguments); });

	return io;
};