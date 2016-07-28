(function () {

  'use strict';

  var module = angular.module('tipo.framework');

  function DefinitionDialogController($scope, $mdDialog) {
    $scope.hide = function() {
      $mdDialog.hide();
    };
    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }

  return module.directive('tpView', function ($mdDialog) {
      return {
        scope: {
          definition: '='
        },
        restrict: 'EA',
        replace: true,
        templateUrl: 'framework/_directives/_views/tp-view.tpl.html',
        link: function(scope, element, attrs){
          function showGroupItem(definition){
            var newScope = scope.$new();
            newScope.definition = definition;
            $mdDialog.show({
              templateUrl: 'framework/generic/_views/view-dialog.tpl.html',
              controller: DefinitionDialogController,
              scope: newScope,
              skipHide: true,
              clickOutsideToClose: true,
              fullscreen: false
            });
          }
          scope.showGroupItem = showGroupItem;
        }
      };
    }
  );

})();
