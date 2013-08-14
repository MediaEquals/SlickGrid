(function ($) {
  /***
   * A sample AJAX data store implementation.
   * Right now, it's hooked up to load all Apple-related Digg stories, but can
   * easily be extended to support and JSONP-compatible backend that accepts paging parameters.
   */
  function RemoteModel() {
    // private
    var PAGESIZE = 50;
    var data = {length: 0};
    var searchstr = "apple";
    var sortcol = null;
    var sortdir = 1;
    var h_request = null;
    var h_requestMethod = 'GET';
    var req = null; // ajax request
    var urlTemplate = 'http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][type][]=submission&q=" + searchstr + "&start=" + (fromPage * PAGESIZE) + "&limit=" + (((toPage - fromPage) * PAGESIZE) + PAGESIZE';
    var urlParams = {};
    var urlParamMapping = {};
    var dataPostProcess = function($data) { return $data; };

    // events
    var onDataLoading = new Slick.Event();
    var onDataLoaded = new Slick.Event();


    function init() {
    }

    function setDataPostProcess(func) {
      dataPostProcess = func;
    }

    function setRequestMethod(getPostDeleteOrPut) {
      h_requestMethod = getPostDeleteOrPut;
    }
    
    function setUrlParamMappings(objectFromKeyToValue) {
      urlParamMapping = objectFromKeyToValue;
    }

    function isDataLoaded(from, to) {
      for (var i = from; i <= to; i++) {
        if (data[i] == undefined || data[i] == null) {
          return false;
        }
      }

      return true;
    }


    function clear() {
      for (var key in data) {
        delete data[key];
      }
      data.length = 0;
    }


    function ensureData(from, to) {
      if (req) {
        req.abort();
        for (var i = req.fromPage; i <= req.toPage; i++)
          data[i * PAGESIZE] = undefined;
      }

      if (from < 0) {
        from = 0;
      }

      var fromPage = Math.floor(from / PAGESIZE);
      var toPage = Math.floor(to / PAGESIZE);

      while (data[fromPage * PAGESIZE] !== undefined && fromPage < toPage)
        fromPage++;

      while (data[toPage * PAGESIZE] !== undefined && fromPage < toPage)
        toPage--;
      
      if (fromPage > toPage || ((fromPage == toPage) && data[fromPage * PAGESIZE] !== undefined)) {
        
        for ( var i = fromPage * PAGESIZE; (i < to); i++ ) {
          if (data[i] === undefined) {
            return loadData(from, fromPage, to, toPage);
          }
        }
        
        return;
      }

      loadData(from, fromPage, to, toPage);

    }

    function loadData(from, fromPage, to, toPage) {
      var url = urlTemplate;
      
      if (h_request != null) {
        clearTimeout(h_request);
      }
      
      var sub = function(out, urlParamMapping, k, v) {
        k = urlParamMapping.hasOwnProperty(k) ? urlParamMapping[k] : k;
        out[k] = v;
        return out;
      };
      
      var outUrlParams = {};
      for (var k in urlParams) {
        if (urlParams.hasOwnProperty(k)) {
          outUrlParams = sub(outUrlParams, urlParamMapping, k, urlParams[k]);
        }
      }
      
      outUrlParams = sub(outUrlParams, urlParamMapping, 'from_page', fromPage);
      outUrlParams = sub(outUrlParams, urlParamMapping, 'to_page', toPage);
      outUrlParams = sub(outUrlParams, urlParamMapping, 'page_size', PAGESIZE);
      if (sortcol) {
        outUrlParams = sub(outUrlParams, urlParamMapping, 'sortcol', sortcol);
        outUrlParams = sub(outUrlParams, urlParamMapping, 'sortdir', sortdir);
      }
  
      h_request = setTimeout(function () {
        for (var i = fromPage; i <= toPage; i++)
          data[i * PAGESIZE] = null; // null indicates a 'requested but not available yet'

        onDataLoading.notify({from: from, to: to});

        req = $.ajax({
          url: url,
          dataType: 'json',
          type: h_requestMethod,
          data: outUrlParams,
          success: function(resp) {
            var from = fromPage * PAGESIZE;
            var rData = dataPostProcess(resp, from, PAGESIZE);

            for (var i = 0; i < rData.length; i++) {
              data[from + i] = rData[i];
              data[from + i].index = from + i;
            }
            
            // This stuff is here so we do not need to get total length, infinite scroll
            data.count = ((toPage+1) * PAGESIZE) + PAGESIZE;
            if ( rData.length < PAGESIZE * (toPage+1 - fromPage) ) {
              data.count = from + rData.length
            }
            data.length = data.count;

            req = null;

            onDataLoaded.notify({from: from, to: to});
          },
          error: function () {
            onError(fromPage, toPage)
          }
        });
        req.fromPage = fromPage;
        req.toPage = toPage;
      }, 100);
    }

    function onError(fromPage, toPage) {
      // alert("error loading pages " + fromPage + " to " + toPage);
    }

    function reloadData(from, to) {
      for (var i = from; i <= to; i++)
        delete data[i];

      ensureData(from, to);
    }


    function setSort(column, dir) {
      sortcol = column;
      sortdir = dir;
      clear();
    }

    function setSearch(str) {
      searchstr = str;
      clear();
    }


    init();

    function setUrlParams(ob) {
        urlParams = ob;
    }

    function setUrlTemplate(str) {
        urlTemplate = str;
    }

    return {
      // properties
      "data": data,

      // methods
      "clear": clear,
      "isDataLoaded": isDataLoaded,
      "ensureData": ensureData,
      "reloadData": reloadData,
      "setSort": setSort,
      "setSearch": setSearch,
      "loadData": loadData,
      "setUrlTemplate": setUrlTemplate,
      "setUrlParams": setUrlParams,
      "setDataPostProcess": setDataPostProcess,
      'setUrlParamMappings': setUrlParamMappings,

      // events
      "onDataLoading": onDataLoading,
      "onDataLoaded": onDataLoaded
    };
  }

  // Slick.Data.RemoteModel
  $.extend(true, window, { Slick: { Data: { RemoteModel: RemoteModel }}});
})(jQuery);
