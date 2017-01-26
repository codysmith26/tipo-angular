(function () {

  'use strict';

  var userBucket = 'user.tipotapp.com';
  var tempBuket = 'temp.tipotapp.com';

  function object2hrefvirt(bucket, object) {
      if (AWS.config.region === 'us-east-1') {
          return document.location.protocol + '//' + bucket + '.s3.amazonaws.com/' + object;
      } else {
          return document.location.protocol + '//' + bucket + '.s3-' + AWS.config.region + '.amazonaws.com/' + object;
      }
  }

  // Convert cars/vw/golf.png to golf.png
  function fullpath2filename(path) {
      return path.replace(/^.*[\\\/]/, '');
  }

  function isfolder(path) {
      return path.endsWith('/');
  }

  // Convert cars/vw/ to vw/
  function prefix2folder(prefix) {
      var parts = prefix.split('/');
      return parts[parts.length-2] + '/';
  }

  function bytesToSize(bytes) {
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 Bytes';
      var ii = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, ii), 2) + ' ' + sizes[ii];
  }
  
  var module = angular.module('tipo.framework');
  return module.directive('tpFile', function () {
      
      return {
        templateUrl: 'framework/_directives/_views/tp-file.tpl.html',
        controller: controller
      };

      function controller($scope, $element, $mdDialog, s3Service, metadataService) {
        metadataService.loadAccount().then(function(accountData){
            if (accountData) {
                myController($scope, $element, $mdDialog, s3Service, accountData);
            }
        }).catch(function(err) {
            console.error(err);    
        });
      }
      
      function myController($scope, $element, $mdDialog, s3Service, accountData) {

        var userPrefix = accountData.s3folder + '/';
        var s3config = { Region: '', Bucket: userBucket, TempBucket: tempBuket, Prefix: userPrefix, Delimiter: '/' };
        
        $scope.$on('refresh', function(args) {
            refreshView();
        });

        function s3draw(data, complete) {
            var prefixes = data.CommonPrefixes.map(function(prefix) {
                return {
                    Key: prefix2folder(prefix.Prefix),
                    LastModified: null,
                    Size: null,
                    s3: 'folder',
                    prefix: prefix.Prefix,
                    href: object2hrefvirt(s3config.Bucket, prefix.Prefix) 
                };
            });
            var objects = data.Contents.map(function(object) {
                return {
                    Key: fullpath2filename(object.Key),
                    LastModified: moment(object.LastModified).fromNow(),
                    Size: bytesToSize(object.Size),
                    s3: 'object',
                    prefix: null,
                    href: object2hrefvirt(s3config.Bucket, object.Key)
                };
            });
            var rows = prefixes.concat(objects);
            $scope.$apply(function () {
                $scope.rows = rows;
            });
            return rows;

        }

        /**
         * Refresh grid
         * Update queried items
         */
        var items = [];
        function refreshView() {
            $scope.promise = s3Service.go(s3config, s3draw).then(function(result) {
                items = result.filter(function(item){
                    return item && item.s3 === 'folder';
                });
                return items;
            }).catch(function(err) {
                $scope.rows = [];
            });
            return $scope.promise;
        }

        $scope.searchTextChange = function(searchText) {
        }

        $scope.selectedItemChange = function(item) {
            // Selection canceled by clicking on cross item
            if (item) {
                if (item.s3 === 'folder') {
                    s3config.Prefix = item.prefix;
                    refreshView();
                }
                if (item.prefix) {
                    // Cut account prefix ouf of item's prefix
                    $scope.searchText = item.prefix.substring(userPrefix.length);
                }
            }
        }

        $scope.querySearch = function(query) {
            if (query === '' || query.lastIndexOf('/') !== -1 && query.lastIndexOf('/') === query.length - 1) {
                s3config.Prefix = userPrefix + query;
                return refreshView();
            } else {
                var lowercaseQuery = angular.lowercase(query);
                return items.filter(function(item) {
                    if (item && item.prefix) {
                        var itemPrefix = item.prefix.substring(userPrefix.length);
                        return itemPrefix.toLowerCase().indexOf(lowercaseQuery) === 0;
                    }
                    return false;
                });
            }
        }

        var $parentScope = $scope;
        $scope.showModal = function(event) {
            $mdDialog.show({
                controller: function($scope) {
                    $scope.delay = 0;
                    $scope.minDuration = 0;
                    $scope.message = 'Please Wait...';
                    $scope.backdrop = true;
                    $scope.submit = function(event) {
                        if ($scope.files) {
                            $scope.files.forEach(function(file) {
                                var promise = s3Service.uploadFile(s3config.TempBucket, s3config.Prefix, file.lfFile);
                                $scope.progress = promise;
                                promise.then(function(result) {
                                    $parentScope.$broadcast('refresh', []);
                                    $mdDialog.hide();
                                }, function(err) {
                                    raiseError(err);
                                });
                            });
                        }
                    }

                    $scope.onCancel = function(event) {
                        $mdDialog.cancel();
                    }

                    function raiseError(err) {
                        console.error(err);
                        if (err && err.errorMessage) {
                            $scope.lastError = err.errorMessage;
                        } else if (err && err.data && err.data.errorMessage) {
                            $scope.lastError = err.data.errorMessage;
                        } else if (err && err.message) {
                            $scope.lastError = err.message;
                        }
                    }
                },
                templateUrl: 'framework/_directives/_views/tp-file-modal.tpl.html',
                parent: angular.element(document.body),
                targetEvent: event,
                clickOutsideToClose: false,
                escapeToClose: false
            });
        }
        
        $scope.selected = [];
        $scope.query = {
            order: 'name',
            limit: 5,
            page: 1
        };
        refreshView();
      }
  });
})();