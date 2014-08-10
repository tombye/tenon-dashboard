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
    templates : {
      names : [
        'issue',
        'globals'
      ]            
    },
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
    loadTemplates : function () {
      var templateLoader = new $.Deferred(),
          onTemplateLoad = function (data, template) {
            this.templates[template] = data;
            this.templateLoader.resolve();
          }.bind(this);

      $.each(this.templates.names, function (idx, template) {
        $.ajax({
        'dataType' : 'html',
        'url' : 'templates/' + template + '.html'
        })
        .done(function (data) {
          onTemplateLoad(data, template);
        });
      });
      return templateLoader;
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
      var resultsData,
          _formatStandard,
          _getUniqueElements,
          _getBestPracticeFails;
      
      _formatStandard = function (standard) {
        var query = standard.replace('Web Content Accessibility Guidelines (WCAG) 2.0, Level A: ', ''),
            googleURL = "http://www.google.com/search?btnI=I%27m+Feeling+Lucky&ie=UTF-8&oe=UTF-8&q=%27",
            WCAGURL = "' site: www.w3.org/TR/WCAG20/";

        return {
          'googleSearch' : googleURL + encodeURI(query + WCAGURL),
          'standard' : standard
        };
      };

      _getUniqueElements = function () {
        var xpaths = {},
            elements = [];

        $.each(responseData.resultSet, function (idx, result) {
          var xpath = result.xpath;

          if (typeof xpaths[xpath] === 'undefined') {
            xpaths[xpath] = {
              'count' : 1,
              'html' : result.errorSnippet
            };
          } else {
            xpaths[xpath].count++;
          }
        });
        $.each(xpaths, function (key, val) {
          elements.push({
            'xpath' : key,
            'count' : val.count,
            'html' : val.html
          });
        });
        return elements;
      };

      _getBestPracticeFails = function () {
        var bestPracticeIds = {},
            bestPracticeFails = [];

        $.each(responseData.resultSet, function (idx, result) {
          var bpID = result.bpID;

          if (typeof bestPracticeIds[bpID] === 'undefined') {
            bestPracticeIds[bpID] = {
              'count' : 1,
              'error' : result.errorDescription
            };
          } else {
            bestPracticeIds[bpID].count++;
          }
        });
        $.each(bestPracticeIds, function (key, val) {
          bestPracticeFails.push({
            'bpID' : key,
            'count' : val.count,
            'error' : val.error
          });
        });
        return bestPracticeFails;
      };

      resultsData = {
        globals : {
          pageUrl : responseData.request.url,
          errors : responseData.resultSummary.issues.totalErrors,
          issues : responseData.resultSummary.issues.totalIssues,
          warnings : responseData.resultSummary.issues.totalWarnings,
          levels : {
            A : responseData.resultSummary.issuesByLevel.A.count,
            AA : responseData.resultSummary.issuesByLevel.AA.count,
            AAA : responseData.resultSummary.issuesByLevel.AAA.count
          },
          elements : _getUniqueElements(),
          bestPracticeFails : _getBestPracticeFails()
        },
        issues : $.map(responseData.resultSet, function (issue, idx) {
          issue.standards = $.map(issue.standards, function (standard, idx) {
            return _formatStandard(standard);
          });
          return issue;
        })
      }; 
      return resultsData;
    },
    displayResults : function (url) {
      var responseData = this.requests[url].data,
          pageGlobalsTemplate = Hogan.compile(this.templates.globals),
          pageIssueTemplate = Hogan.compile(this.templates.issue),
          resultsData,
          pageGlobalsHTML,
          pageIssuesHTML,
          a, b;

      console.log(responseData);

      resultsData = this.processResponse(responseData);
      pageGlobalsHTML = pageGlobalsTemplate.render(resultsData.globals);
      pageIssuesHTML = "<h2>Results</h2>\n";
      for (a = 0, b = resultsData.issues.length; a < b; a++) {
        pageIssuesHTML += pageIssueTemplate.render(resultsData.issues[a]);
      }
      $('#results').append(pageGlobalsHTML + pageIssuesHTML);
    },
    init : function () {
      var _this = this;

      this.loadConfig();
      this.templateLoader = this.loadTemplates();
      this.templateLoader.done(function () {
        this.createRequests();
        this.sendRequests();
      }.bind(this));
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

