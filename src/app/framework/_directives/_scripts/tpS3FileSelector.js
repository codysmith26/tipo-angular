(function () {

  'use strict';

  var module = angular.module('tipo.framework');
  
  return module.directive('tpS3Fileselector', function () {
      return {
        templateUrl: 'framework/_directives/_views/tp-s3-fileselector.tpl.html',
        controller: controller
      };
      
      function controller($scope, $mdDialog) {
        $scope.showS3Explorer = function(event) {
            $mdDialog.show({
                controller: function() {
                },
                template: '<tp:s3-explorer />',
                parent: angular.element(document.body),
                targetEvent: event,
                clickOutsideToClose:true,
            })
            .then(function(answer) {
                $scope.status = 'You said the information was "' + answer + '".';
            }, function() {
                $scope.status = 'You cancelled the dialog.';
            });
        }
      }
  });
})();
