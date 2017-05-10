(function () {

  'use strict';

  var module = angular.module('tipo.framework');

  function TipoObjectDialogController(
    tipoDefinition,
    tipoManipulationService,
    $scope,
    $mdDialog,
    tipoCache,
    tipoRouter,
    tipoInstanceDataService) {

    var _instance = this;

    _instance.tiposWithDefinition = tipoDefinition.tiposWithDefinition;
    _instance.tipoDefinition = tipoDefinition.tipoDefinition;
    _instance.popup = true;
    _instance.tipos = $scope.tipos;
    _instance.tipo_fields = $scope.tipo_fields;
    _instance.selectedTipos = $scope.selectedTipos;
    _instance.perm = $scope.perm;
    _instance.disablecreate = $scope.disablecreate;
    $scope.fullscreen = true;
    if ($scope.selectedTipos.length > 0) {
      _.each(_instance.tiposWithDefinition, function(tipo){
          _.each($scope.selectedTipos,function(selected){
            if(tipo.key === selected.key){
              tipo.selected = true;
            }
          })
        });
    };
    _instance.maximize = function(){
      $scope.fullscreen = true;
    };

    _instance.restore = function(){
      $scope.fullscreen = false;
    };

    _instance.selectTipo = function(tipoSelected,event,tiposData){
      if (!$scope.isarray) {
        _.each(tiposData, function(tipo){
          tipo.selected = false;
          $scope.selectedTipos = [];
        });
      }
      tipoSelected.selected = !tipoSelected.selected;
      if(tipoSelected.selected){
        $scope.selectedTipos.push(tipoSelected);
      }else{
        _.remove($scope.selectedTipos,function(tipo){
          return tipo.key === tipoSelected.key;
        });
      }
      event.stopPropagation();
    }
    _instance.finish = function() {      
      $mdDialog.hide($scope.selectedTipos);
    };

    _instance.cancel = function() {
      $mdDialog.cancel();
    };

    _instance.addTipo = function() {
      var promise = $mdDialog.show({
        templateUrl: 'framework/_directives/_views/tp-lookup-popup-select-new.tpl.html',
        controller: 'TipoCreateRootController',
        controllerAs: 'tipoRootController',
        fullscreen: true,
        resolve: /*@ngInject*/
        {
          tipo: function() {
            return undefined;
          },
          tipoDefinition: function(){
            return _instance.tipoDefinition;
          }
        },
        skipHide: true,
        clickOutsideToClose: true,
        fullscreen: true
      });
      promise.then(function(tipos){
        if (_.isarray(tipos)) {
          _instance.tipos = tipos;
          _instance.tiposWithDefinition = tipoManipulationService.mergeDefinitionAndDataArray(_instance.tipoDefinition, tipos, $scope.label_field);
        };
        tipoRouter.endStateChange();
      })
      return promise;
    };

    _instance.search = function(){
      var filter = {};
      if (!_.isEmpty(_instance.searchText)) {
        filter.tipo_filter = "(_all:(" + _instance.searchText + "*))";
      };
      var page = 1;
      filter.page = angular.copy(page);
      filter.per_page = _instance.tipoDefinition.tipo_meta.default_page_size;
      tipoRouter.startStateChange();
      tipoCache.evict($scope.tipo_name);
      tipoInstanceDataService.search($scope.tipo_name, filter).then(function(tiposData){
        _instance.tipos = tiposData;
        var tiposWithDefinition = tipoManipulationService.mergeDefinitionAndDataArray(_instance.tipoDefinition, tiposData, $scope.label_field);
        _instance.tiposWithDefinition = tiposWithDefinition;
        page++;
        tipoRouter.endStateChange();
      });
    }
  }
  return module.directive('tpLookup', function (
    tipoInstanceDataService,
    tipoManipulationService,
    tipoRouter,
    tipoRegistry,
    $mdDialog,
    $mdSelect,
    tipoDefinitionDataService) {
      return {
        scope: {
          root: '=',
          context: '=',
          parent: '=',
          field: '=',
          fieldvalue: '=',
          basefilter: '=',
          realtedtipo: '=',
          isarray: '=',
          ispopup: '=',
          required: '=',
          labelfield: '=',
          allowcreate: '=',
          selectfield: '='
        },
        restrict: 'EA',
        replace: true,
        template: '<ng-include src="fieldTemplate" tp-include-replace/>',
        link: function(scope, element, attrs){
           var fieldvalue = scope.fieldvalue;
          var isarray = Boolean(scope.isarray);
          // var isGroup = Boolean(field._ui.isGroup);
          var isMandatory = Boolean(scope.required);
          scope.ispopup = scope.ispopup;

          var fieldTemplate;
          if(isarray){
            fieldTemplate = 'framework/_directives/_views/tp-lookup-multiple.tpl.html';
          }else{
            fieldTemplate = 'framework/_directives/_views/tp-lookup-single.tpl.html';
          }
          scope.fieldTemplate = fieldTemplate;

          var basefilter = scope.basefilter;
          scope.tipo_name = scope.realtedtipo;
          var label_field = scope.labelfield;
          

          scope.selectedTipos = [];
          if(isarray){
            scope.selectedTipos = fieldvalue;
          }else{
            scope.selectedTipos = [fieldvalue];
          }

          if(scope.allowcreate){
            scope.disablecreate = true;
          }else{
            scope.disablecreate = false;
          }

          function optionsFormat(results){
            scope.optionSelected = _.map(results, function(each){
              return {
                key: each.key,
                label: each.label
              };
            });
          }

          function extractDropdownList(tipo_data,options,startName,remName){
            if (!startName) {
              if (_.isarray(tipo_data[remName])) {
                _.each(tipo_data[remName],function(each){
                  options.push({
                    key: each,
                    label: each
                  });
                })
              }else{
                options.push({
                  key: tipo_data[remName],
                  label: tipo_data[remName]
                });
              }
              return;
            };
            if (_.isarray(tipo_data[startName])) {
              _.each(tipo_data[startName],function(each){
                extractDropdownList(each,options,remName.substr(0,remName.indexOf('.')),remName.substr(remName.indexOf('.') + 1));
              });
            }else{
              extractDropdownList(tipo_data[startName],options,remName.substr(0,remName.indexOf('.')),remName.substr(remName.indexOf('.') + 1));
            }
          }

          scope.loadOptions = function (searchText,page_size){
            delete scope.options;
            var searchCriteria = {};
            var filter;
            var perspectiveMetadata = tipoManipulationService.resolvePerspectiveMetadata();
            /*if(tipo_name !== perspectiveMetadata.tipoName){
              filter = perspectiveMetadata.tipoFilter;
            }*/
            if(!_.isUndefined(basefilter)){
              var basefilterExpanded = tipoManipulationService.expandFilterExpression(basefilter, scope.root, scope.context);
              filter = basefilterExpanded;
            }
            if(!_.isUndefined(filter)){
              searchCriteria.tipo_filter = filter;
            }
            if (scope.selectfield && !_.isEmpty(scope.selectfield)) {
              searchCriteria.tipo_fields = scope.selectfield + ',tipo_id';
              label_field = scope.selectfield;
            };
            searchCriteria.page = 1;
            // If for the dropdown we require custom page size then we can get from the page_size parameter
            searchCriteria.per_page = 500;
            if(!_.isUndefined(searchCriteria.tipo_filter) && !_.isEmpty(searchCriteria.tipo_filter)  && !_.isUndefined(searchText)){
              searchCriteria.tipo_filter += " AND (tipo_id:(" + searchText + "*) OR " + label_field + ":(" + searchText + "*))" ;
            }else{
              if (!_.isUndefined(searchText)) {
                searchCriteria.tipo_filter = "(tipo_id:(" + searchText + "*) OR " + label_field + ":(" + searchText + "*))";
              }
            };
            searchCriteria.short_display = 'N';
            return tipoInstanceDataService.search(scope.tipo_name, searchCriteria).then(function(results){
              scope.tipos = results;
              
              if (!scope.selectfield) {
                scope.options = _.map(results, function(each){
                  return {
                    key: each.tipo_id,
                    label: each[label_field]
                  };
                });
              }else{
                scope.options = [];
                var remName = scope.selectfield.substr(scope.selectfield.indexOf('.') + 1);
                var startName = scope.selectfield.substr(0,scope.selectfield.indexOf('.'));
                if (results[0][startName] || results[0][remName]) {
                  extractDropdownList(results[0],scope.options,startName,remName)
                };
              }
              if(isMandatory && !fieldvalue){
                if(isarray){
                  fieldvalue = [scope.options[0]];
                }else{
                  fieldvalue = scope.options[0];
                }
              }
              var tipo_perm = tipoRegistry.get(scope.tipo_name + '_resdata');
              scope.perm = tipo_perm.perm;
              if(tipo_perm.perm.substr(2,1) === 0){
                scope.disablecreate = true;
              }
            });
          };

          scope.searchTerm = {};
          scope.cleanup = function(){
            delete scope.searchTerm.text;
          };

          scope.stopBubbling = function(event){
            event.stopPropagation();
          };

          scope.renderSelection = function(){
            var text = '<div class="placeholder"> </div>';
            if (fieldvalue && fieldvalue.length){
              text = '<div class="multiple-list">';
              _.each(fieldvalue, function(each){
                text += '<div>' +each.label + '</div>';
              });
              text += '</div>';
            }
            return text;
          };

          if (scope.ispopup) {
            tipoDefinitionDataService.getOne(scope.tipo_name).then(function(definition){
              var searchText;
              scope.popupDefinition = definition;
              scope.loadOptions(searchText,definition.tipo_meta.default_page_size);
            });
          }else{
            if(isarray){
              scope.options = scope.fieldvalue;
            }
          }

          function openTipoObjectDialog(){
            var searchText;
            scope.loadOptions(searchText,scope.popupDefinition.tipo_meta.default_page_size);            
            var newScope = scope.$new();
            newScope.isarray = isarray;
            newScope.field = scope.context;
            newScope.disablecreate = scope.disablecreate;
            newScope.tipo_name = scope.tipo_name;
            newScope.perm = scope.perm;
            newScope.label_field = label_field;
            if (scope.root) {
            newScope.tipo_fields = scope.root.tipo_fields}
            newScope.selectedTipos = scope.selectedTipos;
            var promise = $mdDialog.show({
              templateUrl: 'framework/_directives/_views/tp-lookup-popup-select.tpl.html',
              controller: TipoObjectDialogController,
              controllerAs: 'tipoRootController',
              scope: newScope,
              resolve: /*@ngInject*/
              {
                tipoDefinition: function(tipoManipulationService) {
                  var tiposWithDefinition = tipoManipulationService.mergeDefinitionAndDataArray(scope.popupDefinition, scope.tipos, label_field);
                  return {tipoDefinition: scope.popupDefinition, tiposWithDefinition: tiposWithDefinition}
                }
              },
              skipHide: true,
              clickOutsideToClose: true,
              fullscreen: true
            });
            return promise;
          }

          scope.tipoSearch = function(searchText){
            scope.loadOptions(searchText);
          };

          scope.addTipo = function() {
            $mdSelect.hide();
            var promise = $mdDialog.show({
              templateUrl: 'framework/_directives/_views/tp-lookup-popup-select-new.tpl.html',
              controller: 'TipoCreateRootController',
              controllerAs: 'tipoRootController',
              fullscreen: true,
              resolve: /*@ngInject*/
              {
                tipo: function() {
                  return undefined;
                },
                tipoDefinition: function(tipoDefinitionDataService){
                  return tipoDefinitionDataService.getOne(scope.tipo_name);
                }
              },
              skipHide: true,
              clickOutsideToClose: true
            });
            promise.then(function(tipos){
              if (_.isarray(tipos)) {
                scope.loadOptions();
              };
              tipoRouter.endStateChange();
            })
            return promise;
          };

          scope.tipoObjecSelectiontDialog = function(){
            var promise = openTipoObjectDialog();
            promise.then(function(selectedObjects){
              optionsFormat(selectedObjects);
              if(isarray){
                fieldvalue = scope.optionSelected;
                scope.selectedTipos = fieldvalue;
              }else{
                fieldvalue = scope.optionSelected[0];
                scope.selectedTipos = [fieldvalue];
              }
            });
          }

        }
      };
    }
  );

})();