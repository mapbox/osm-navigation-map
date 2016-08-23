'use strict';
var osmAuth = require('osm-auth');

var auth = osmAuth({
    oauth_secret: 'DPjp9YIqhqrCLBRZ8bhwPZV2pNhlNSVsMiyLUskC',
    oauth_consumer_key: 'ffGkvyNI6Tcko35eNo8FmFp1VYaTL6rYsa9wTPi8'
});

function done(err, res) {
    if (err) {
        return;
    }
    var u = res.getElementsByTagName('user')[0];
    var displayName =  u.getAttribute('display_name');
    document.getElementById('user').innerHTML = displayName;
    document.getElementById('user').style.display = 'block';
    $("#currentReviewer").html(displayName);
}

function showDetails() {
    auth.xhr({
        method: 'GET',
        path: '/api/0.6/user/details'
    }, done);
}

function hideDetails() {
    document.getElementById('user').innerHTML = '';
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
