(function (root) {
  "use strict";

  var $ = root.jQuery,
      getQueryVariable,
      PageRequest,
      tenonDashboard;

  getQueryVariable = function (variable) {
    var query = window.location.search.replace(/\/{1}$/, '');
    var vars = query.substring(1).split("&");
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      if (pair[0] === variable) {
        return pair[1];
      }
    }
    return false;
  };


  $(document).ready(function () {
    var username = getQueryVariable('username');
    var password = getQueryVariable('password');
    if (!username || !password) { return; }
    var basicRequest = new XMLHttpRequest();
    basicRequest.onreadystatechange = function (XHRObj) { console.log(XHRObj.srcElement); }
    basicRequest.open("get", "http://localhost:5000", true, username, password);
    basicRequest.withCredentials = true
    basicRequest.send()
  });
})(window);

