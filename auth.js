'use strict';
var osmAuth = require('osm-auth');

var auth = osmAuth({
    oauth_secret: '***REMOVED***',
    oauth_consumer_key: '***REMOVED***'
});

function done(err, res) {
    if (err) {
        return;
    }
    var u = res.getElementsByTagName('user')[0];
    var displayName =  u.getAttribute('display_name');
    document.getElementById('user').innerHTML = displayName;
    document.getElementById('user').style.display = 'block';
}

function showDetails() {
    auth.xhr({
        method: 'GET',
        path: '/api/0.6/user/details'
    }, done);
}

function hideDetails() {
    document.getElementById('user').style.display = 'none';
}

auth.update = function () {
    if (auth.authenticated()) {
        document.getElementById('logout').style.display = 'block';
        showDetails();
    } else {
        document.getElementById('logout').style.display = 'none';
        hideDetails();
    }
}

module.exports = auth;
