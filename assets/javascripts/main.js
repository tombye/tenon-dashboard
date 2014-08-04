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
      'dataType' : 'json',
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
    pageIssuesTemplate : '<div class="issue">' + 
                          '<p class="issue-title">Problem: {{errorTitle}}</p>' +
                          '<p class="issue-priority">Priority: {{priority}}</p>' +
                          '<p class="issue-description">{{errorDescription}}</p>' +
                          '<p class="issue-rule">Rule: {{resultTitle}}</p>' +
                          '<ul class="issue-standards">' +
                            '{{#standards}}' +
                            '<li>{{standard}}</li>' +
                            '{{/standards}}' +
                          '</ul>' +
                        '</div>',
    pageGlobalsTemplate : '<div class="globals">' +
                            '<h1 class="page-url">{{pageUrl}}</h1>' +
                            '<p>Errors: {{errors}}</p>' +
                            '<p>Issues: {{issues}}</p>' +
                            '<p>Warnings: {{warnings}}</p>' +
                            '<p>Issues of AAA level: {{levels.AAA}}</p>' +
                            '<p>Issues of AA level: {{levels.AA}}</p>' +
                            '<p>Issues of A level: {{levels.A}}</p>' +
                          '</div>',
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
    processResponse : function (responseData) {
      var resultsData = {
        globals : {
          pageUrl : responseData.request.url,
          errors : responseData.resultSummary.issues.totalErrors,
          issues : responseData.resultSummary.issues.totalIssues,
          warnings : responseData.resultSummary.issues.totalWarnings,
          levels : {
            A : responseData.resultSummary.issuesByLevel.A.count,
            AA : responseData.resultSummary.issuesByLevel.AA.count,
            AAA : responseData.resultSummary.issuesByLevel.AAA.count
          }
        },
        issues : $.map(responseData.resultSet, function (issue, idx) {
          issue.standards = $.map(issue.standards, function (standard, idx) {
            return { 'standard' : standard };
          });
          return issue;
        })
      }; 
      return resultsData;
    },
    displayResults : function (url) {
      var responseData = this.requests[url].data,
          pageGlobalsTemplate = Hogan.compile(this.pageGlobalsTemplate),
          pageIssuesTemplate = Hogan.compile(this.pageIssuesTemplate),
          resultsData,
          pageGlobalsHTML,
          pageIssuesHTML,
          a, b;

      console.log(responseData);
      resultsData = this.processResponse(responseData);
      pageGlobalsHTML = pageGlobalsTemplate.render(resultsData.globals);
      pageIssuesHTML = '';
      for (a = 0, b = resultsData.issues.length; a < b; a++) {
        pageIssuesHTML += pageIssuesTemplate.render(resultsData.issues[a]);
      }
      $('#results').append(pageGlobalsHTML + pageIssuesHTML);
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

