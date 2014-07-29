(function (root) {
  "use strict";

  var $ = root.jQuery,
      getQueryVariable,
      PageRequest,
      tenonDashboard,
      USERNAME,
      PASSWORD;

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

  PageRequest = function (url) {
    this.url = url;              
  };
  PageRequest.prototype.opts = {};
  PageRequest.prototype.username = USERNAME;
  PageRequest.prototype.password = PASSWORD;
  PageRequest.prototype.send = function () {
    var data = this.opts,
        opts,
        _this = this;

    data.url = this.url;
    opts = {
      'data' : data,
      'dataType' : 'text',
      'username' : this.username,
      'password' : this.password,
      'url' : root.config.api,
      'xhrFields' : {
        'withCredentials' : true
      }
    };
    $.ajax(opts)
    .done(function (data, status, jqXHR) {
      _this.onDone(data);
    })
    .fail(function (jqXHR, status, error) {
      _this.onError(status);
    });
  };
  PageRequest.prototype.onDone = function (data) {
    this.data = data;
    tenonDashboard.displayResults(this.url);
  };
  PageRequest.prototype.onError = function (status) {
    $(document).on('request.fail', {
      'url' : this.url,
      'error' : status
    });
  };

  tenonDashboard = {
    requests : {},
    makeRequestObj : function (url, opts) {
      var _this = this,
          pageRequest;
                     
      pageRequest = new PageRequest(url);
      if (opts !== undefined) {
        pageRequest.opts = {};
        $.each(opts, function (idx, opt) {
          pageRequest.opts[opt] = opts[opt];
        }); 
      }
      return pageRequest;
    },
    loadConfig : function () {
      var config = root.config;

      // load up PageRequest prototype with the default options
      $.each(config.defaultOpts, function (key, val) {
        PageRequest.prototype.opts[key] = val;
      });
    },
    createRequests : function () {
      var config = root.config,
          _this = this;

      $.each(config.pages, function (idx, pageObj) {
        var args = (pageObj.opts) ? [pageObj.url, pageObj.opts] : [pageObj.url];

        _this.requests[pageObj.url] = _this.makeRequestObj.apply(_this, args);
      });
    },
    sendRequests : function () {
      var url;

      for (url in this.requests) {
        this.requests[url].send();
      }; 
    },
    processResults : function () {
                     
    },
    displayResults : function (url) {
      console.log(this.requests[url].data);
    },
    init : function () {
      var _this = this;

      this.loadConfig();
      this.createRequests();
      this.sendRequests();
    }  
  };
  root.tenonDashboard = tenonDashboard;

  $(document).ready(function () {
    USERNAME = getQueryVariable('username');
    PASSWORD = getQueryVariable('password');
    if (!USERNAME || !PASSWORD) { return; }
    tenonDashboard.init();
  });
})(window);

