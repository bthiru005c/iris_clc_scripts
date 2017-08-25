"use strict";

var config = require('../cloudcode')
	, logger = require('../lib/logwinston.js')
	, irisEventTriggers = require('../server/iriseventtriggers')
	, request = require('request')
	, http = require('http')
	, fetch = require('node-fetch')
	, cc = require('../cloudcode');

function cancelNotificationToCallees(traceID, payload) {
	try {
		data = JSON.parse(payload.data);
	} catch (e) {
		logger.error("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=JSON.parse() exception when parsing payload.data : ", payload.data + "; " + e);
		return;
	}

	logger.info("type=cancelNotificationToCallees, TraceID=" + traceID + ", Trigger=TRUE, Message=app_domain=" + payload.app_domain + " event_type=" + payload.event_type + " event_triggered_by=" + data.event_triggered_by + " root_event_room_id=" + data.root_event_room_id);
	if (payload && data && data.root_event_room_id && data.event_triggered_by)  {
		var em_options = {
			url: config.config.event_manager + "/v1/notification/participants/room/" + data.root_event_room_id + "/routingid/" + data.event_triggered_by,
			headers: {
    		'Authorization': "Bearer " + cc.iris_core_jwt,
    		'Trace-Id': traceID
			}
		};
 		request(em_options, function (error, response, em_resp_body) {
			if (!error && response.statusCode == 200) {
				var em_resp ;
				try {
					em_resp = JSON.parse(em_resp_body);
				} catch (e) {
					logger.error("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=JSON.parse() exception when parsing response body: ", em_resp_body);
					return;
				}
				if ( (!em_resp.to_routing_ids) || (!em_resp.to_routing_ids instanceof Array) ) {
					logger.error("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=Invalid Payload Received");
					return
				}
				// parse payload.root_event_userdata to extract notification JSON blob
				var root_event_user_data ;
				try {
					root_event_user_data = JSON.parse(this.data.root_event_userdata);
				} catch (e) {
					logger.error("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=JSON.parse() exception when parsing userdata : ", this.data.root_event_userdata + "; " + e);
					return;
				}
				if (!root_event_user_data.notification) {
					logger.info("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=No notification object available");
					return
				}

				// parse payload.root_event_eventdata to extract rtc_server info
				var root_event_event_data ;
				try {
					root_event_event_data = JSON.parse(this.data.root_event_eventdata);
				} catch (e) {
					logger.error("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=JSON.parse() exception when parsing eventdata: ", this.data.root_event_eventdata + "; " + e);
					return;
				}
				if (!root_event_event_data.rtc_server) {
					logger.error("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=No RTC server object available");
					return
				}

				for (var i = 0; i < em_resp.to_routing_ids.length; i++) {
					if (em_resp.to_routing_ids[i].routing_id === em_resp.from_routing_id) {
						// Do not publish to caller via NM
						continue
					}
					var topic = encodeURIComponent(root_event_user_data.notification.topic + "/" + em_resp.to_routing_ids[i].routing_id);
					logger.info("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=" + topic + " RoomID=" + this.data.root_event_room_id);
					var nm_request_body = {
						payload : {
							type: "cancel",
							trace_id: traceID,
							routing_id: em_resp.to_routing_ids[i].routing_id,
							room_id: this.data.root_event_room_id,
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
						logger.info("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=Response from Notification Manager=" + res.status);
					})
					.catch(function(err) {
						logger.info("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=Error in attempt to send request to Notification Manager=" + err);
					});
				}
			} else {
				if (error) {
					logger.error("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=" + error);
				} else {
					if ( (response.statusCode > 200) && (response.statusCode < 500) ) {
						logger.error("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=Response from Event Manager=" + response.statusCode);
					} else {
						logger.error("type=cancelNotificationToCallees, TraceID=" + traceID + ", Message=status code =" + response.statusCode);
					}
				}
			}
		}.bind({data: data}));
	}
};

module.exports = function(scripts_modules) {
	// the key in this dictionary can be whatever you want
	// just make sure it won't override other modules
	scripts_modules['/usr/local/iris_cloud_code/scripts/cancel_notification_to_callees.js'] = cancelNotificationToCallees;
};
