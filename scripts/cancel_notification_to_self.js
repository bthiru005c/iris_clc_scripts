"use strict";

var config = require('../cloudcode')
	, logger = require('../lib/logwinston.js')
	, irisEventTriggers = require('../server/iriseventtriggers')
	, request = require('request')
	, http = require('http')
	, fetch = require('node-fetch')
	, cc = require('../cloudcode');

function cancelNotificationToSelf(traceID, payload) {
	try {
		data = JSON.parse(payload.data);
	} catch (e) {
		logger.error("type=cancelNotificationToSelf, TraceID=" + traceID + ", Message=JSON.parse() exception when parsing payload.data : ", payload.data + "; " + e);
		return;
	}

	logger.info("type=cancelNotificationToSelf, TraceID=" + traceID + ", Trigger=TRUE, Message=app_domain=" + payload.app_domain + " event_type=" + payload.event_type + " event_triggered_by=" + data.event_triggered_by + " root_event_room_id=" + data.root_event_room_id);
	if (payload && data && data.root_event_room_id && data.event_triggered_by)  {
		// parse payload.root_event_userdata to extract notification JSON blob
		var root_event_user_data ;
		try {
			root_event_user_data = JSON.parse(data.root_event_userdata);
		} catch (e) {
			logger.error("type=cancelNotificationToSelf, TraceID=" + traceID + ", Message=JSON.parse() exception when parsing userdata : ", data.root_event_userdata + "; " + e);
			return;
		}
		if (!root_event_user_data.notification) {
			logger.info("type=cancelNotificationToSelf, TraceID=" + traceID + ", Message=No notification object available");
			return
		}

		var topic = encodeURIComponent(root_event_user_data.notification.topic + "/" + data.event_triggered_by);
		logger.info("type=cancelNotificationToSelf, TraceID=" + traceID + ", Message=" + topic);
		var nm_request_body = {
			payload : {
				type: "cancel",
				trace_id: traceID,
				routing_id: data.event_triggered_by,
				room_id: data.root_event_room_id
			}
		}
		// publish to notification manager
		fetch(config.config.notification_manager + '/v1/topic/' + topic, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Authorization': "Bearer " + cc.iris_core_jwt,
				'Trace-Id': traceID
			},
			body: JSON.stringify(nm_request_body)
		})
		.then (function(res) {
			logger.info("type=cancelNotificationToSelf, TraceID=" + traceID + ", Message=Response from Notification Manager=" + res.status);
		})
		.catch(function(err) {
			logger.info("type=cancelNotificationToSelf, TraceID=" + traceID + ", Message=Error in attempt to send request to Notification Manager=" + err);
		});
	} else {
		if (error) {
			logger.error("type=cancelNotificationToSelf, TraceID=" + traceID + ", Message=" + error);
		} else {
			if ( (response.statusCode > 200) && (response.statusCode < 500) ) {
				logger.error("type=cancelNotificationToSelf, TraceID=" + traceID + ", Message=Response from Event Manager=" + response.statusCode);
			} else {
				logger.error("type=cancelNotificationToSelf, TraceID=" + traceID + ", Message=status code =" + response.statusCode);
			}
		}
	}
};

module.exports = function(scripts_modules) {
	// the key in this dictionary can be whatever you want
	// just make sure it won't override other modules
	scripts_modules['/usr/local/iris_cloud_code/scripts/cancel_notification_to_self.js'] = cancelNotificationToSelf;
};
