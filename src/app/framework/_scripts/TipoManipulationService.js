(function() {

  'use strict';

  function TipoManipulationService(tipoRegistry) {

    function mapDefinitionToUI(definition){
      if(_.isUndefined(definition.tipo_meta)){
        definition = {
          tipo_meta: definition
        };
      }
      
      var meta = definition.tipo_meta;

      if(_.isUndefined(definition._ui)){
        var listTemplate = meta.tipo_list_view || 'framework.generic.list-fluid';
        var viewTemplate = meta.tipo_detail_view || 'framework.generic.view';
        var createTemplate = meta.tipo_create_view || 'framework.generic.create';
        var editTemplate = meta.tipo_edit_view || 'framework.generic.edit';

        definition._ui = {
          listTemplate: listTemplate,
          listTemplateUrl: resolveTemplateUrl(listTemplate),
          viewTemplate: viewTemplate,
          viewTemplateUrl: resolveTemplateUrl(viewTemplate),
          createTemplate: createTemplate,
          createTemplateUrl: resolveTemplateUrl(createTemplate),
          editTemplate: editTemplate,
          editTemplateUrl: resolveTemplateUrl(editTemplate)
        };
      }

      definition = expandFieldHierarchy(definition);

      return definition;
    }

    function extractShortDisplayFields(definition){
      var eligibleFields = [];
      extractShortDisplayFieldsRecursive(definition, eligibleFields);
      return eligibleFields;
    }

    function extractShortDisplayFieldsRecursive(definition, collection){
      var eligibleFields = _.filter(definition.tipo_fields, function(each){
        return each.short_display && !each.hidden;
      });
      _.each(eligibleFields, function(each){
        if(each._ui.isGroup){
          extractShortDisplayFieldsRecursive(each, collection);
        }else{
          collection.push(each);
        }
      });
    }

    function expandFieldHierarchy(definition){
      definition = _.cloneDeep(definition);
      prepareFieldHierarchyRecursive(definition);
      delete definition.tipo_field_groups;
      definition._ui.hierarchyPrepared = true;
      return definition;
    }

    function prepareFieldHierarchyRecursive(definition, currentRoot, isSecondLevelTipo){
      if(definition._ui.hierarchyPrepared){
        // this method needs to be idempotent, hence returning if the hierarchy is already prepared
        return;
      }
      currentRoot = currentRoot || definition;
      isSecondLevelTipo = Boolean(isSecondLevelTipo);
      if(isSecondLevelTipo){
        currentRoot.tipo_fields = _.filter(currentRoot.tipo_fields, function(each){
          return each.primary_key || each.meaningful_key;
        });
      }
      if(currentRoot.tipo_fields){
        _.each(currentRoot.tipo_fields, function(tipo_field){
          tipo_field._ui = tipo_field._ui || {};
          var fieldName = tipo_field.field_name;
          var fieldType = tipo_field.field_type;
          var isArray = Boolean(tipo_field.tipo_array);

          tipo_field._ui.isArray = isArray;

          var parts = fieldType.split('.');
          if(parts.length > 1){
            if(parts[0] === 'FieldGroup'){
              tipo_field._ui.isGroup = true;
              var fieldGroup = _.cloneDeep(_.find(definition.tipo_field_groups, {tipo_group_name: parts[1]}));
              tipo_field.tipo_fields = fieldGroup.tipo_fields;
              prepareFieldHierarchyRecursive(definition, tipo_field);
            }else if(parts[0] === 'Tipo'){
              tipo_field._ui.isTipoRelationship = true;
              tipo_field._ui.relatedTipo = parts[1];
              var relatedTipoDefinition = _.cloneDeep(tipoRegistry.get(parts[1]));
              tipo_field.key_field = getPrimaryKey(relatedTipoDefinition);
              tipo_field.label_field = getMeaningfulKey(relatedTipoDefinition);
              if(tipo_field.relationship_type === 'composition'){
                tipo_field._ui.isGroup = true;
                tipo_field.tipo_fields = relatedTipoDefinition.tipo_fields;
              }
            }
          }else{
            // Do nothing for now. Eventually we may need to set other UI specific metadata
          }
        });
      }
    }

    function mergeDefinitionAndData(tipoDefinition, tipoData){
      if(tipoDefinition.tipo_fields){
        _.each(tipoDefinition.tipo_fields, function(field){
          var fieldKey = field.field_name;
          var fieldType = field.field_type;
          var fieldValue = tipoData[fieldKey];
          if(_.isUndefined(fieldValue)){
            return;
          }
          var isArray = Boolean(_.get(field, '_ui.isArray'));
          var isGroup = Boolean(_.get(field, '_ui.isGroup'));
          var isRelatedTipo = Boolean(_.get(field, '_ui.isTipoRelationship'));
          if(isRelatedTipo){
            if(isArray){
              field._value = [];
              _.each(fieldValue, function(each){
                var keyFieldValue = _.get(each, field.key_field.field_name);
                var labelFieldValue = _.get(each, field.label_field.field_name);
                field._value.push({
                  key: keyFieldValue,
                  label: labelFieldValue
                });
              });
            }else{
              var keyFieldValue = _.get(fieldValue, field.key_field.field_name);
              var labelFieldValue = _.get(fieldValue, field.label_field.field_name);
              field._value = {
                key: keyFieldValue,
                label: labelFieldValue
              };
            }
          }
          else if(isGroup){
            if(isArray){
              _.each(fieldValue, function(item){
                var itemField = generateGroupItem(field);
                mergeDefinitionAndData(itemField, item);
              });
            }else{
              mergeDefinitionAndData(field, fieldValue);
            }
          }else{
            if(isArray){
              field._value = [];
              _.each(fieldValue, function(each){
                field._value.push({
                  key: each,
                  label: each
                });
              });
            }else{
              var label = fieldValue;
              if(fieldType === 'boolean'){
                label = fieldValue ? 'Yes' : 'No';
              }else if (fieldType === 'date_time'){
                if(fieldValue){
                  fieldValue = new Date(fieldValue);
                }
              }
              field._value = {
                key: fieldValue,
                label: label
              };
            }
          }
        });
      }
    }

    function extractDataFromMergedDefinition(tipoDefinition, tipoData){
      if(tipoDefinition.tipo_fields){
        _.each(tipoDefinition.tipo_fields, function(field){
          var fieldKey = field.field_name;
          var fieldType = field.field_type;
          var fieldValue = field._value;
          var hasValue = !_.isEmpty(fieldValue);
          var hasSimpleValue = !_.isEmpty(_.get(fieldValue, 'key'));
          var isArray = Boolean(_.get(field, '_ui.isArray'));
          var isGroup = Boolean(_.get(field, '_ui.isGroup'));
          var isRelatedTipo = Boolean(_.get(field, '_ui.isTipoRelationship'));
          if(isRelatedTipo){
            if(hasValue){
              if(isArray){
                tipoData[fieldKey] = [];
                _.each(fieldValue, function(each){
                  tipoData[fieldKey].push({
                    TipoID: each.key
                  });
                });
              }else{
                if(hasSimpleValue){
                  tipoData[fieldKey] = {
                    TipoID: fieldValue.key
                  };
                  // TODO: Sushil - Temporary code just for mock
                  tipoData[fieldKey][field.label_field.field_name] = fieldValue.label;
                }
              }
            }
          }
          else if(isGroup){
            var groupData;
            if(isArray){
              if(!_.isEmpty(field._items)){
                groupData = [];
                _.each(field._items, function(item){
                  var itemData = {};
                  extractDataFromMergedDefinition(item, itemData);
                  if(!_.isEmpty(itemData)){
                    groupData.push(itemData);
                  }
                });
                if(!_.isEmpty(groupData)){
                  tipoData[fieldKey] = groupData;
                }
              }
            }else{
              groupData = {};
              extractDataFromMergedDefinition(field, groupData);
              if(!_.isEmpty(groupData)){
                tipoData[fieldKey] = groupData;
              }
            }
          }else{
            if(hasValue){
              var finalValue;
              if(isArray){
                tipoData[fieldKey] = [];
                _.each(fieldValue, function(each){
                  finalValue = translateSimpleValue(field, each.key);
                  if(finalValue){
                    tipoData[fieldKey].push(translateSimpleValue(field, each.key));
                  }
                });
              }else{
                finalValue = translateSimpleValue(field, fieldValue.key);
                if(finalValue){
                  tipoData[fieldKey] = translateSimpleValue(field, fieldValue.key);
                }
              }
            }
          }
        });
      }
    }

    function translateSimpleValue(field, value){
      if(!_.isUndefined(value)){
        var fieldType = field.field_type;
        if(fieldType === 'date_time'){
          if(_.isDate(value)){
            return value;
          }
        }
      }
      return value;
    }

    function getFieldValue(tipo, expression){
      if(expression.indexOf('[') === -1){
        // simple extraction without any arrays
        return _.get(tipo, expression);
      }else{
        var value;
        // more elaborate extraction
        var firstPart = expression.substring(0, expression.indexOf('['));
        value = _.get(tipo, firstPart);
        if(!_.isUndefined(value)){
          var indexPart = expression.substring(expression.indexOf('[') + 1, expression.indexOf(']'));
          // need to standardize the index, else quite impossible to derive the value
          // value = _.find(value, {TipoID: indexPart});
          value = value[parseInt(indexPart, 10)];
          if(!_.isUndefined(value)){
            var remainingPart = expression.substring(expression.indexOf(']') + 2);
            if(!_.isEmpty(remainingPart)){
              value = getFieldValue(value, remainingPart);
            }
          }
        }
        return value;
      }
    }

    function generateGroupItem(groupField){
      var itemField = {
        display_name: groupField.display_name,
        tipo_fields: _.cloneDeep(groupField.tipo_fields),
        _ui: {
          isGroupItem: true
        }
      };
      groupField._items = groupField._items || [];
      groupField._items.push(itemField);
      return itemField;
    }

    function resolveTemplateUrl(templateId){
      var parts = templateId.split('.');
      var folders = _.initial(parts);
      var file = _.last(parts);
      return folders.join('/') + '/_views/' + file + '.tpl.html';
    }

    function getPrimaryKey(tipoDefinition){
      return _.find(tipoDefinition.tipo_fields, function(each){
        return Boolean(each.primary_key);
      });
    }

    function getMeaningfulKey(tipoDefinition){
      return _.find(tipoDefinition.tipo_fields, function(each){
        return Boolean(each.meaningful_key);
      });
    }

    // Expose the functions that need to be consumed from outside
    this.mapDefinitionToUI = mapDefinitionToUI;
    this.expandFieldHierarchy = expandFieldHierarchy;
    this.extractShortDisplayFields = extractShortDisplayFields;
    this.getFieldValue = getFieldValue;
    this.mergeDefinitionAndData = mergeDefinitionAndData;
    this.extractDataFromMergedDefinition = extractDataFromMergedDefinition;
    this.generateGroupItem = generateGroupItem;
    this.getPrimaryKey = getPrimaryKey;
    this.getMeaningfulKey = getMeaningfulKey;
    this.resolveTemplateUrl = resolveTemplateUrl;

  }

  angular.module('tipo.framework')
    .service('tipoManipulationService', TipoManipulationService);

})();