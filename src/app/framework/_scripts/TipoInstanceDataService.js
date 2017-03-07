(function() {

  'use strict';

  function TipoInstanceDataService(
    tipoResource,
    tipoCache,
    tipoDefinitionDataService,
    tipoManipulationService,
    metadataService,
    $q) {

    var _instance = this;

    function unwrapAndSort(collection){
      collection = _.filter(collection, function(each){
        each.data.perm = each.perm
        return !_.isUndefined(each.data.tipo_id);
      });
      collection = _.map(collection, function(each){
        return each.data;
      });
      collection = _.sortBy(collection, function(each){
        if(_.get(each, 'tipo_meta.tipo_sequence')){
          return parseFloat(each.tipo_meta.tipo_sequence, 10);
        }else{
          return 999;
        }
      });
      return collection;
    }

    function populateGeolocation(tipo){
      if(metadataService.geoLocation){
        tipo.data.geo_latitude = metadataService.geoLocation.latitude;
        tipo.data.geo_longitude = metadataService.geoLocation.longitude;
      }
    }

    function getCollectionResource(tipo_name){
      return tipoResource.all(tipo_name);
    }

    function getDocumentResource(tipo_name, id){
      var data = getCollectionResource(tipo_name).one(id)
      return getCollectionResource(tipo_name).one(id);
    }

    _instance.search = function(tipo_name, criteria, reload){
      criteria = criteria || {};
      criteria.short_display = 'Y';
      criteria.cckey = metadataService.cckey;
      var headers = {};
      if(reload){
        headers['Cache-Control'] = 'max-age=0';
      }
      return getCollectionResource(tipo_name).getList(criteria, headers).then(unwrapAndSort);
    };

    // TODO: Not used as of now but something like this might be required in future for the header menu which is now hard-coded
    _instance.getTopPerspectives = function(){
      var promise = _instance.search('TopPerspective').then(function(perspectives){
        var childPromises = [];
        perspectives = _.sortBy(perspectives, function(each){
          if(each.sequence){
            return parseFloat(each.sequence, 10);
          }else{
            return 999;
          }
        });
        _.each(perspectives, function(each){
          each.menu_items = _.sortBy(each.menu_items, function(item){
            if(item.sequence){
              return parseFloat(item.sequence, 10);
            }else{
              return 999;
            }
          });
          _.each(each.menu_items, function(item){
            if(item.tipo){
              var childPromise = tipoDefinitionDataService.getOne(item.tipo, true).then(function(definition){
                item.tipoDefinition = definition;
              });
              childPromises.push(childPromise);
            }
          });
        });
        return $q.all(childPromises).then(function(){
          return perspectives;
        })
      });

      return promise.then(tipoManipulationService.prepareTopPerspectives);

    }

    _instance.upsertAll = function(tipo_name, tipos){
      tipoCache.evict(tipo_name);
      tipos = _.map(tipos, function(each){
        var tipo = {
          tipo_name: tipo_name,
          data: angular.copy(each)
        };
        populateGeolocation(tipo);
        return tipo;
      });
      var promise = getCollectionResource(tipo_name).doPUT(tipos).then(unwrapAndSort);
      // load list again in background
      promise.then(function(){
        _instance.search(tipo_name, undefined, true);
      });
      return promise;
    };

    _instance.getOne = function(tipo_name, id, criteria, reload){
      criteria = criteria || {};
      criteria.cckey = metadataService.cckey;
      var headers = {};
      if(reload){
        headers['Cache-Control'] = 'max-age=0';
      }
      return getDocumentResource(tipo_name, id).get(criteria, headers);
    };

    _instance.updateOne = function(tipo_name, tipo, id){
      tipoCache.evict(tipo_name, id);
      tipo = {
        tipo_name: tipo_name,
        data: angular.copy(tipo)
      };
      if(_.isUndefined(tipo.data.tipo_id)){
        console.log('Tipo ID not defined, setting it');
        tipo.data.tipo_id = id;
      }
      populateGeolocation(tipo);
      return getDocumentResource(tipo_name, id).doPUT(tipo).then(function(){
        return _instance.getOne(tipo_name, id, undefined, true);
      });
    };

    _instance.performSingleAction = function(tipo_name, tipo_id, action, additional_tipo_name, additional_tipo){
      tipoCache.evict(tipo_name, tipo_id);
      var tipo = {};
      if(!_.isUndefined(additional_tipo_name)){
        tipo = {
          tipo_name: additional_tipo_name,
          data: additional_tipo
        };
      }
      return getDocumentResource(tipo_name, tipo_id).doPUT(tipo, undefined, {tipo_action: action});
    };

    _instance.performBulkAction = function(tipo_name, action, selected_tipo_ids, additional_tipo_name, additional_tipo){
      var tipos = _.map(selected_tipo_ids, function(each){
        return {
          tipo_name: tipo_name,
          data: {
            tipo_id: each
          }
        };
      });
      if(!_.isUndefined(additional_tipo_name)){
        tipos.push({
          tipo_name: additional_tipo_name,
          data: additional_tipo
        });
      }
      return getCollectionResource(tipo_name).doPUT(tipos, undefined, {tipo_action: action});
    };

    _instance.deleteOne = function(tipo_name, id, queryParams){
      tipoCache.evict(tipo_name, id);
      var promise = getDocumentResource(tipo_name, id).remove(queryParams);
      // load list again in background
      _instance.search(tipo_name, undefined, true);
      return promise;
    };

  }

  angular.module('tipo.framework')
    .service('tipoInstanceDataService', TipoInstanceDataService);

})();