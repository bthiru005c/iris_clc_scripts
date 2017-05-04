"use strict";

var logger = require('../lib/logwinston.js')
	, fetch = require('node-fetch');
	
function OnVmEvent(traceID, payload) {
	try {
		data = JSON.parse(payload.data); 
	} catch (e) {
		logger.error("TraceID=" + traceID + ", Message=JSON.parse() exception when parsing payload.data : ", payload.data + "; " + e);
		return;
	}
	logger.info("TraceID=" + traceID + ", Trigger=TRUE, Message=app_domain= " + payload.app_domain + " event_type= " + payload.event_type + "data= " + payload.data);
	fetch('http://96.119.1.103:8080/OmtpNotificationHandler/receive-sms/text/to/20868', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Trace-Id': traceID
		},
		body: JSON.stringify(payload)
	})
	.then (function(res) {
		logger.info("TraceID=" + traceID + ", Message=Response=" + res.status);
	})
	.catch(function(err) {
		logger.info("TraceID=" + traceID + ", Message=Error in attempt to send request=" + err);
	});
};


module.exports = function(scripts_modules) {
	scripts_modules['/usr/local/iris_cloud_code/scripts/omtp_vvm.js'] = OnVmEvent;
};
