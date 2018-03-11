'use strict';

var path = require('path');
var express = require('express');
var cors = require('cors')
var lodash = require('lodash');
var proxy = require('http-proxy-middleware');

var pathMappings = [
  {
    path: '/',
    dir: 'app'
  },
  {
	path: '/g',
	dir: 'g'
  },
  {
    path: '/bower_components',
    dir: 'bower_components'
  },
  {
    path: '/g/public',
    // url: 'https://dev.tipotapp.com/app/d/tipotapp/studentmanagementapp'
    url: 'https://dev.tipotapp.com',
    // url: 'https://dev.billionbases.com',
    // url: 'https://dev.tipotapp.com/app/d/hr/hrbuddy'
    // url: 'https://dev.tipotapp.com/app/d/hr/dialadish'
    // url: 'https://dev.tipotapp.com/app/d/tipotapp/sdm'
    // url: 'https://dev.tipotapp.com/app/d/tipotapp/tourmanagmentapp'
    // url: 'https://app.billionbases.com/app/d/deltagene/billionbases'
    // url: 'https://dev.tipotapp.com/app/d/deltagene/billionbases'
  },
  {
    path: '/public',
    // url: 'https://dev.tipotapp.com/app/d/tipotapp/studentmanagementapp'
    url: 'https://dev.tipotapp.com',
    // url: 'https://dev.billionbases.com',
    // url: 'https://dev.tipotapp.com/app/d/hr/hrbuddy'
    // url: 'https://dev.tipotapp.com/app/d/hr/dialadish'
    // url: 'https://dev.tipotapp.com/app/d/tipotapp/tourmanagmentapp'
    // url: 'https://dev.tipotapp.com/app/d/tipotapp/sdm'
    // url: 'https://app.billionbases.com/app/d/deltagene/billionbases'
    // url: 'https://dev.tipotapp.com/app/d/deltagene/billionbases'
  },
  {
	    path: '/tipo_upload',
	    // url: 'https://dev.tipotapp.com/app/d/tipotapp/studentmanagementapp'
	    url: 'https://dev.tipotapp.com',
      // url: 'https://dev.billionbases.com',
	    // url: 'https://dev.tipotapp.com/app/d/hr/hrbuddy'
	    // url: 'https://dev.tipotapp.com/app/d/hr/dialadish'
      // url: 'https://dev.tipotapp.com/app/d/tipotapp/tourmanagmentapp'
	    // url: 'https://dev.tipotapp.com/app/d/tipotapp/sdm'
	    // url: 'https://app.billionbases.com/app/d/deltagene/billionbases'
	    // url: 'https://dev.tipotapp.com/app/d/deltagene/billionbases'
	  },
	  {
		    path: '/g/private',
		    // url: 'https://dev.tipotapp.com/app/d/tipotapp/studentmanagementapp'
		    url: 'https://dev.tipotapp.com',
        // url: 'https://dev.billionbases.com',
		    // url: 'https://dev.tipotapp.com/app/d/hr/hrbuddy'
		    // url: 'https://dev.tipotapp.com/app/d/hr/dialadish'
        // url: 'https://dev.tipotapp.com/app/d/tipotapp/tourmanagmentapp'
		    // url: 'https://dev.tipotapp.com/app/d/tipotapp/sdm'
		    // url: 'https://app.billionbases.com/app/d/deltagene/billionbases'
		    // url: 'https://dev.tipotapp.com/app/d/deltagene/billionbases'
	},
  // {
  //   path: '/app',
  //   url: 'https://dev.tipotapp.com/app'
  // },
  {
    path: '/api',
    //url: 'http://localhost:9001'
    //url: 'https://app.billionbases.com/dev'
    //url: 'https://dev.tipotapp.com/2000000001.1000000001.raj@tipotapp.com/2000000001'
    //url: 'https://dev.tipotapp.com/2000000001.1000000001.prasad.sid@deltagene.com/2000000002'
    // url: 'https://app.billionbases.com',
    // url: 'https://dev.billionbases.com',
    url: 'https://dev.tipotapp.com'
  }
];

var proxyConfig = {
  forward: {}
};

var app = express();
// app.use(cors());
lodash.each(pathMappings, function(mapping){
  console.log("mapping");
  console.log(mapping);
  if(mapping.dir){
    app.use(mapping.path, express.static(path.resolve(__dirname, mapping.dir)));
  }else if(mapping.url){
    if (mapping.path !== "/api") {
      app.use(mapping.path, proxy({target: mapping.url, changeOrigin: true}));
    }else{
      app.use(mapping.path, proxy({target: mapping.url, changeOrigin: true}));
    }
  }
});

module.exports = app;
