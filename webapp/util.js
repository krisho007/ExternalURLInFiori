//URL parameters
var urlParameter = [],
	hash;
var q = location.hash.split('?')[1];
if (q != undefined) {
	q = q.split('&');
	for (var i = 0; i < q.length; i++) {
		hash = q[i].split('=');
		urlParameter.push(hash[1]);
		urlParameter[hash[0]] = hash[1];
	}
}

function getExternalUrl() {
	var q = location.hash.split("?url=")[1];
	var k = q.split("&title")[0];
	return k;
}

function getApplicationTitle() {
	var q = location.hash.split("?url=")[1];
	var k = q.split("&title=")[1];
	if (k === "" || k === undefined){
		return "Legacy Viewer";
	}
	return decodeURI(k);
}