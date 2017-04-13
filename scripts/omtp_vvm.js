"use strict";

var request = require('request')
	, config = require('../cloudcode')
	, logger = require('../lib/logwinston.js')
	, fetch = require('node-fetch')
	, cc = require('../cloudcode')
	, http = require('http');
	
function OnVmEvent(payload) {
	try {
		request.post(
			'http://96.119.1.103:8080/OmtpNotificationHandler/receive-sms/text/to/20868',
			{ json:  payload},
			function (error, response, body) {
				if (!error && response.statusCode == 200) {
					logger.info("Response: "+ body);
				}
			}
		);
	} catch (e) {
		logger.error("JSON.parse() exception when parsing payload.data : ", payload.data + "; " + e);
		return;
	}
	
	logger.info("app_domain=" + payload.app_domain + " event_type=" + payload.event_type + " data=" + payload.data);
};


module.exports = function(scripts_modules) {
	scripts_modules['/usr/local/iris_cloud_code/scripts/omtp_vvm.js'] = OnVmEvent;
};
