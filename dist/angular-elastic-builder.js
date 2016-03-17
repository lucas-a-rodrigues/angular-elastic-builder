/**
 * # angular-elastic-builder
 * ## Angular Module for building an Elasticsearch Query
 *
 * @version v1.5.3
 * @link https://github.com/lucas-a-rodrigues/angular-elastic-builder.git
 * @license MIT
 * @author Dan Crews <crewsd@gmail.com>, Lucas Rodrigues <lucasmoc@gmail.com>
 */

/**
 * angular-elastic-builder
 *
 * /src/module.js
 *
 * Angular Module for building an Elasticsearch query
 */

(function(angular) {
  'use strict';

  angular.module('angular-elastic-builder', [
    'RecursionHelper',
  ]);

})(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/BuilderDirective.js
 *
 * Angular Directive for injecting a query builder form.
 */

 (function(angular) {
   'use strict';

   angular.module('angular-elastic-builder')
    .directive('elasticBuilder', [
      'elasticQueryService',

      function EB(elasticQueryService) {

        return {
          scope: {
            data: '=elasticBuilder',
          },

          templateUrl: 'angular-elastic-builder/BuilderDirective.html',

          link: function(scope) {
            var data = scope.data;

            scope.filters = [];

            /**
             * Removes either Group or Rule
             */
            scope.removeChild = function(idx) {
              scope.filters.splice(idx, 1);
            };

            /**
             * Adds a Single Rule
             */
            scope.addRule = function() {
              scope.filters.push({});
            };

            /**
             * Adds a Group of Rules
             */
            scope.addGroup = function() {
              scope.filters.push({
                type: 'group',
                subType: 'and',
                rules: [],
              });
            };

            /**
             * Any time "outside forces" change the query, they should tell us so via
             * `data.needsUpdate`
             */
            scope.$watch('data.needsUpdate', function(curr) {
              if (! curr) return;
              if (isNotJsonValid(data.query.query.constant_score.filter.and)) throw new Error('Define a base query like: query.constant_score.filter.and = []');
              
              scope.filters = elasticQueryService.toFilters(data.query.query.constant_score.filter.and, scope.data.fields);
              scope.data.needsUpdate = false;
            });

            /**
             * Changes on the page update the Query
             */
            scope.$watch('filters', function(curr) {
              if (! curr) return;
              
              var filters = elasticQueryService.toQuery(scope.filters, scope.data.fields);              
              data.query = { query : { constant_score : { filter : { and : filters }}}};
            }, true);
            
            var isNotJsonValid = function(json) {
            	try {
            		JSON.parse(JSON.stringify(json));
            	} catch(e) {
            		return true;
            	}
            	return false;
            }
          }
        };
      }

    ]);

 })(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/Chooser.js
 *
 * This file is to help recursively, to decide whether to show a group or rule
 */

(function(angular) {
  'use strict';

  var app = angular.module('angular-elastic-builder');

  app.directive('elasticBuilderChooser', [
    'RecursionHelper',
    'groupClassHelper',

    function elasticBuilderChooser(RH, groupClassHelper) {

      return {
        scope: {
          elasticFields: '=',
          item: '=elasticBuilderChooser',
          onRemove: '&',
        },

        templateUrl: 'angular-elastic-builder/ChooserDirective.html',

        compile: function (element) {
          return RH.compile(element, function(scope, el, attrs) {
            var depth = scope.depth = (+ attrs.depth)
              , item = scope.item;

            scope.getGroupClassName = function() {
              var level = depth;
              if (item.type === 'group') level++;

              return groupClassHelper(level);
            };
          });
        }
      };
    }

  ]);

})(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/Group.js
 */

(function(angular) {
  'use strict';

  var app = angular.module('angular-elastic-builder');

  app.directive('elasticBuilderGroup', [
    'RecursionHelper',
    'groupClassHelper',

    function elasticBuilderGroup(RH, groupClassHelper) {

      return {
        scope: {
          elasticFields: '=',
          group: '=elasticBuilderGroup',
          onRemove: '&',
        },

        templateUrl: 'angular-elastic-builder/GroupDirective.html',

        compile: function(element) {
          return RH.compile(element, function(scope, el, attrs) {
            var depth = scope.depth = (+ attrs.depth);
            var group = scope.group;

            scope.addRule = function() {
              group.rules.push({});
            };
            scope.addGroup = function() {
              group.rules.push({
                type: 'group',
                subType: 'and',
                rules: [],
              });
            };

            scope.removeChild = function(idx) {
              group.rules.splice(idx, 1);
            };

            scope.getGroupClassName = function() {
              return groupClassHelper(depth + 1);
            };
          });
        }
      };
    }

  ]);

})(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/Rule.js
 */

(function(angular) {
	'use strict';

	var app = angular.module('angular-elastic-builder');

	app.directive('elasticBuilderRule', [

	function elasticBuilderRule() {
		return {
			scope : {
				elasticFields : '=',
				rule : '=elasticBuilderRule',
				onRemove : '&',
			},

			templateUrl : 'angular-elastic-builder/RuleDirective.html',

			link : function(scope) {

				scope.getType = function() {
					var fields = scope.elasticFields, field = scope.rule.field;

					if (!fields || !field) return;

					return fields[field].type;
				};

				scope.initRule = function() {
					var rule = scope.rule;
					rule.subType = 'equals';
					
					switch (scope.getType()) {
						case 'term':
						case 'boolean': 
							rule.value = '';
							break;
						case 'number':
							rule.value = 0;
							break;
						case 'date':
							rule.value = 0;
							rule.date = today();
							break;
						case 'multi':
							rule.value = [];
							break;
						default:
							throw new Error('Unexpected type!');
					}
				};
				
				var today = function() {
					var date = new Date();
					return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
				};

			},

			controller : function($scope) {
				$scope.uiSelectOptions = { dropdownAutoWidth : true };
			}
		};
	} ]);
})(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/RuleTypes.js
 *
 * Determines which Rule type should be displayed
 */

(function(angular) {
	'use strict';

	var app = angular.module('angular-elastic-builder');

	app.directive('elasticType', [

	function() {
		return {
			scope : {
				type : '=elasticType',
				rule : '=',
				guide : '=',
			},

			template : '<ng-include src="getTemplateUrl()" />',

			link : function(scope) {
				scope.getTemplateUrl = function() {
					var type = scope.type;
					if (!type) return;

					type = type.charAt(0).toUpperCase() + type.slice(1);
					
					return 'angular-elastic-builder/types/' + type + '.html';
				};

				
				scope.booleans = [{ value : 'S', description : 'Sim' },
				                  { value : 'N', description : 'Não' }];

				scope.inputNeeded =	function() {
					var needs =	[ 'equals', 'notEquals', 'prefix', 'contains', 'last', 'next',
					           	  'gt', 'gte', 'lt', 'lte' ];
					return ~needs.indexOf(scope.rule.subType);
				};

				scope.dateNeeded = function() {
					var needs = [ 'equals', 'gt', 'gte', 'lt', 'lte' ];
					return ~needs.indexOf(scope.rule.subType);
				};

				scope.numberNeeded = function() {
					var needs = [ 'last', 'next' ];
					return ~needs.indexOf(scope.rule.subType);
				};

			},

			controller : function($scope) {
				$scope.uiSelectOptions = {
					dropdownAutoWidth : true
				};
			}
		};
	}

	]);

})(window.angular);

(function(angular) {"use strict"; angular.module("angular-elastic-builder").run(["$templateCache", function($templateCache) {$templateCache.put("angular-elastic-builder/BuilderDirective.html","<div class=\"elastic-builder\">\r\n  <div class=\"filter-panels\">\r\n    <div class=\"list-group form-inline\">\r\n      <div\r\n        data-ng-repeat=\"filter in filters\"\r\n        data-elastic-builder-chooser=\"filter\"\r\n        data-elastic-fields=\"data.fields\"\r\n        data-on-remove=\"removeChild($index)\"\r\n        data-depth=\"0\"></div>\r\n      <div class=\"list-group-item actions\">\r\n        <a class=\"btn btn-xs btn-primary\" title=\"Add Rule\" data-ng-click=\"addRule()\">\r\n          <i class=\"fa fa-plus\"></i>\r\n        </a>\r\n        <a class=\"btn btn-xs btn-primary\" title=\"Add Group\" data-ng-click=\"addGroup()\">\r\n          <i class=\"fa fa-list\"></i>\r\n        </a>\r\n      </div>\r\n    </div>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("angular-elastic-builder/ChooserDirective.html","<div\r\n  class=\"list-group-item elastic-builder-chooser\"\r\n  data-ng-class=\"getGroupClassName()\">\r\n\r\n  <div data-ng-if=\"item.type === \'group\'\"\r\n    data-elastic-builder-group=\"item\"\r\n    data-depth=\"{{ depth }}\"\r\n    data-elastic-fields=\"elasticFields\"\r\n    data-on-remove=\"onRemove()\"></div>\r\n\r\n  <div data-ng-if=\"item.type !== \'group\'\"\r\n    data-elastic-builder-rule=\"item\"\r\n    data-elastic-fields=\"elasticFields\"\r\n    data-on-remove=\"onRemove()\"></div>\r\n\r\n</div>\r\n");
$templateCache.put("angular-elastic-builder/GroupDirective.html","<div class=\"elastic-builder-group\">\r\n  <h7>Se\r\n    <select data-ng-model=\"group.subType\" ui-select2>\r\n      <option value=and>todas</option>\r\n      <option value=\"or\">alguma</option>\r\n    </select>\r\n    (d)as condi&ccedil;&otilde;es forem satisfeitas\r\n  </h7>\r\n  <div\r\n    data-ng-repeat=\"rule in group.rules\"\r\n    data-elastic-builder-chooser=\"rule\"\r\n    data-elastic-fields=\"elasticFields\"\r\n    data-depth=\"{{ +depth + 1 }}\"\r\n    data-on-remove=\"removeChild($index)\"></div>\r\n\r\n  <div class=\"list-group-item actions\" data-ng-class=\"getGroupClassName()\">\r\n    <a class=\"btn btn-xs btn-primary\" title=\"Adicionar regra\" data-ng-click=\"addRule()\">\r\n      <i class=\"fa fa-plus\"></i>\r\n    </a>\r\n    <a class=\"btn btn-xs btn-primary\" title=\"Adicionar grupo\" data-ng-click=\"addGroup()\">\r\n      <i class=\"fa fa-list\"></i>\r\n    </a>\r\n    <a class=\"btn btn-xs btn-danger remover\" data-ng-click=\"onRemove()\">\r\n      <i class=\"fa fa-minus\"></i>\r\n    </a>\r\n  </div>\r\n\r\n</div>\r\n");
$templateCache.put("angular-elastic-builder/RuleDirective.html","<div class=\"elastic-builder-rule\">\r\n  <select data-ui-select2=\"uiSelectOptions\" data-ng-model=\"rule.field\" data-ng-change=\"initRule()\">\r\n  	<option data-ng-repeat=\"(key, value) in elasticFields\" value=\"{{ key }}\">{{ value.description }}</option>\r\n  </select>\r\n\r\n  <span data-elastic-type=\"getType()\" data-rule=\"rule\" data-guide=\"elasticFields[rule.field]\"></span>\r\n\r\n  <a class=\"btn btn-xs btn-danger remover\" data-ng-click=\"onRemove()\">\r\n    <i class=\"fa fa-minus\"></i>\r\n  </a>\r\n\r\n</div>\r\n");
$templateCache.put("angular-elastic-builder/types/Boolean.html","<span class=\"boolean-rule\">\r\n  <select data-ng-model=\"rule.subType\" data-ui-select2=\"uiSelectOptions\">\r\n    <!-- Term Options -->\r\n    <optgroup label=\"Texto\">\r\n      <option value=\"equals\">Igual</option>\r\n    </optgroup>\r\n\r\n    <!-- Generic Options -->\r\n    <optgroup label=\"Gen&eacute;rico\">\r\n      <option value=\"exists\">Existe</option>\r\n      <option value=\"notExists\">N&atilde;o existe</option>\r\n    </optgroup>\r\n  </select>\r\n\r\n  <select data-ui-select2=\"uiSelectOptions\" data-ng-if=\"inputNeeded()\" data-ng-model=\"rule.value\">\r\n	<option data-ng-repeat=\"choice in booleans\" value=\"{{ choice.value }}\">{{ choice.description }}</option>\r\n  </select>\r\n</span>\r\n");
$templateCache.put("angular-elastic-builder/types/Date.html","<span class=\"date-rule\">\r\n  <select data-ng-model=\"rule.subType\" data-ui-select2=\"uiSelectOptions\">\r\n\r\n    <optgroup label=\"Per&iacute;odo\">\r\n      <option value=\"last\">Nos &uacute;ltimos</option>\r\n      <option value=\"next\">Nos pr&oacute;ximos</option>\r\n    </optgroup>\r\n\r\n    <optgroup label=\"Data\">\r\n      <option value=\"equals\">=</option>\r\n      <option value=\"gt\">&gt;</option>\r\n      <option value=\"gte\">&ge;</option>\r\n      <option value=\"lt\">&lt;</option>\r\n      <option value=\"lte\">&le;</option>\r\n    </optgroup>\r\n\r\n    <optgroup label=\"Gen&eacute;rico\">\r\n      <option value=\"exists\">Existe</option>\r\n      <option value=\"notExists\">N&atilde;o existe</option>\r\n    </optgroup>\r\n  </select>\r\n\r\n  <span data-ng-if=\"numberNeeded()\"><input type=\"number\" class=\"form-control\"\r\n    data-ng-model=\"rule.value\" min=0 size=\"3\" /> dias</span>\r\n\r\n  <input type=\"text\" class=\"form-control\" data-ng-if=\"dateNeeded()\" data-provide=\"datepicker\" data-date-format=\"dd/mm/yyyy\"\r\n    data-ng-model=\"rule.date\" data-ng-init=\"init(rule.date,\'\')\" />\r\n\r\n</span>\r\n");
$templateCache.put("angular-elastic-builder/types/Multi.html","<span class=\"multi-rule\">\r\n  <select data-ng-model=\"rule.subType\" data-ui-select2=\"uiSelectOptions\">\r\n  \r\n    <optgroup label=\"Texto\">\r\n      <option value=\"equals\">Igual</option>\r\n      <option value=\"notEquals\">Diferente</option>\r\n    </optgroup>\r\n    \r\n    <optgroup label=\"Gen&eacute;rico\">\r\n      <option value=\"exists\">Existe</option>\r\n      <option value=\"notExists\">N&atilde;o existe</option>\r\n    </optgroup>\r\n  </select>\r\n  <select multiple=\"multiple\" data-ui-select2=\"uiSelectOptions\"\r\n  	data-ng-multiple=\"true\" data-ng-if=\"inputNeeded()\" data-ng-model=\"rule.value\">\r\n	<option data-ng-repeat=\"choice in guide.choices\" value=\"{{ choice.value }}\">{{ choice.description }}</option>\r\n  </select>\r\n</span>\r\n");
$templateCache.put("angular-elastic-builder/types/Number.html","<span class=\"number-rule\">\r\n  <select data-ng-model=\"rule.subType\" data-ui-select2=\"uiSelectOptions\">\r\n    <optgroup label=\"Numeral\">\r\n      <option value=\"equals\">=</option>\r\n      <option value=\"notEquals\">!=</option>\r\n      <option value=\"gt\">&gt;</option>\r\n      <option value=\"gte\">&ge;</option>\r\n      <option value=\"lt\">&lt;</option>\r\n      <option value=\"lte\">&le;</option>\r\n    </optgroup>\r\n\r\n    <optgroup label=\"Gen&eacute;rico\">\r\n      <option value=\"exists\">Existe</option>\r\n      <option value=\"notExists\">N&atilde;o existe</option>\r\n    </optgroup>\r\n  </select>\r\n\r\n  <!-- Range Fields -->\r\n  <input type=\"number\" class=\"form-control\" data-ng-if=\"inputNeeded()\"\r\n    data-ng-model=\"rule.value\" min=\"{{ guide.minimum }}\" max=\"{{ guide.maximum }}\" />\r\n</span>\r\n");
$templateCache.put("angular-elastic-builder/types/Term.html","<span class=\"elastic-term\">\r\n  <select data-ng-model=\"rule.subType\" data-ui-select2=\"uiSelectOptions\">\r\n    <!-- Term Options -->\r\n    <optgroup label=\"Texto\">\r\n      <option value=\"equals\">Igual</option>\r\n      <option value=\"notEquals\">Diferente</option>\r\n      <option value=\"prefix\">Come&ccedil;a</option>\r\n      <option value=\"contains\">Cont&eacute;m</option>\r\n    </optgroup>\r\n\r\n    <!-- Generic Options -->\r\n    <optgroup label=\"Gen&eacute;rico\">\r\n      <option value=\"exists\">Existe</option>\r\n      <option value=\"notExists\">N&atilde;o existe</option>\r\n    </optgroup>\r\n\r\n  </select>\r\n  <input class=\"form-control\" type=\"text\" data-ng-if=\"inputNeeded()\"\r\n   data-ng-model=\"rule.value\" />\r\n</span>\r\n");}]);})(window.angular);
/**
 * angular-elastic-builder
 *
 * /src/services/GroupClassHelper.js
 *
 * This keeps all of the groups colored correctly
 */

(function(angular) {
  'use strict';

  angular.module('angular-elastic-builder')
    .factory('groupClassHelper', function groupClassHelper() {

      return function(level) {
        var levels = [
          '',
          'list-group-item-info',
          'list-group-item-success',
          'list-group-item-warning',
          'list-group-item-danger',
        ];

        return levels[level % levels.length];
      };
    });

})(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/services/QueryService.js
 *
 * This file is used to convert filters into queries, and vice versa
 */

(function(angular) {
	'use strict';

	angular.module('angular-elastic-builder').factory('elasticQueryService', [ function() {

		return {
			toFilters : toFilters,
			toQuery : toQuery,
		};
	} ]);

	function toFilters(query, fieldMap) {
		var filters = query.map(parseQueryGroup.bind(query, fieldMap));
		return filters;
	}

	function toQuery(filters, fieldMap) {
		var query = filters.map(parseFilterGroup.bind(filters, fieldMap)).filter(function(item) {
			return !!item;
		});
		return query;
	}

	function parseQueryGroup(fieldMap, group, truthy) {
		if (truthy !== false)
			truthy = true;

		var key = Object.keys(group)[0], typeMap = {
			or : 'group',
			and : 'group',
			range : 'number',
		}, type = typeMap[key] || 'item', obj = getFilterTemplate(type);

		switch (key) {
			case 'or':
			case 'and':
				obj.rules = group[key].map(parseQueryGroup.bind(group, fieldMap));
				obj.subType = key;
				break;
				
			case 'missing':
			case 'exists':
				obj.field = group[key].field;
				obj.subType = { exists : 'exists', missing : 'notExists' }[key];
				delete obj.value;
				break;
				
			case 'term':
			case 'terms':
				obj.field = Object.keys(group[key])[0];
				obj.subType = truthy ? 'equals' : 'notEquals';
				obj.value = group[key][obj.field];
				break;
				
			case 'regexp':
				obj.field = Object.keys(group[key])[0];
				obj.subType = 'contains';
				obj.value = group[key][obj.field].replace(".*", "").replace("(?i)", "");
				break;
				
			case 'prefix':
				obj.field = Object.keys(group[key])[0];
				obj.subType = 'prefix';
				obj.value = group[key][obj.field];
				break;
				
			case 'range':
				obj.field = Object.keys(group[key])[0];
				obj.subType = Object.keys(group[key][obj.field])[0];
				
				if (angular.isNumber(group[key][obj.field][obj.subType])) {
					obj.value = group[key][obj.field][obj.subType];
					
				} else if (angular.isDefined(Object.keys(group[key][obj.field])[1])) {
					var date = group[key][obj.field]['gte'];
					
					if (date.indexOf('now-') > -1) {
						obj.subType = 'last';
						obj.value = parseInt(date.split('now-')[1].split('d')[0]);
					} else if (date.indexOf('now') > -1) {
						obj.subType = 'next';
						date = group[key][obj.field]['lte'];
						obj.value = parseInt(date.split('now+')[1].split('d')[0]);
					} else {
						obj.subType = 'equals';
						var parts = date.split('T')[0].split('-');
						obj.date = parts[2] + '/' + parts[1] + '/' + parts[0];
					}
				} else {
					var date = group[key][obj.field][obj.subType];
					var parts = date.split('T')[0].split('-');
					obj.date = parts[2] + '/' + parts[1] + '/' + parts[0];
				}
				break;
				
			case 'not':
				obj = parseQueryGroup(fieldMap, group[key].filter, false);
				break;
				
			default:
				obj.field = Object.keys(group[key])[0];
				break;
		}
		return obj;
	}

	function parseFilterGroup(fieldMap, group) {
		var obj = {};
		if (group.type === 'group') {
			obj[group.subType] = group.rules.map(parseFilterGroup.bind(group, fieldMap)).filter(function(item) {
				return !!item;
			});
			return obj;
		}

		var fieldName = group.field;
		var fieldData = fieldMap[fieldName];

		if (!fieldName || !group.subType) return;
		
		//Common subTypes
		switch (group.subType) {
			
			case 'exists':
				obj.exists = { field : fieldName };
				break;
			case 'notExists':
				obj.missing = { field : fieldName };
				break;
			case 'equals':
				if (fieldData.type === 'date') break;
				if (isUndefinedOrNull(group.value)) return;
				
				if (angular.isArray(group.value)) {
					obj.terms = {};
					obj.terms[fieldName] = group.value;
				} else {
					obj.term = {};
					obj.term[fieldName] = group.value;
				}
				break;
			case 'notEquals':
				if (isUndefinedOrNull(group.value)) return;
				
				if (angular.isArray(group.value)) {
					obj.not = { filter : { terms : {}}};
					obj.not.filter.terms[fieldName] = group.value;
				} else {
					obj.not = { filter : { term : {}}};
					obj.not.filter.term[fieldName] = group.value;
				}
				break;	
			
		}

		//Specific type rule
		switch (fieldData.type) {
			
			case 'boolean':			
			case 'term':				
				switch (group.subType) {
					case 'prefix':
						if (isUndefinedOrNull(group.value)) return;
						
						obj.prefix = {};
						obj.prefix[fieldName] = group.value;
						break;
					case 'contains':
						if (isUndefinedOrNull(group.value)) return;
						
						obj.regexp = {};
						obj.regexp[fieldName] = ".*(?i)" + group.value + ".*";
						break;
				}
				break;

			case 'number':
				if (isNotNumber(group.value)) return;
				if (group.subType === 'equals' || group.subType === 'notEquals') break; 
				
				obj.range = {};
				obj.range[fieldName] = {};
				obj.range[fieldName][group.subType] = group.value;
				break;

			case 'date':
				switch(group.subType) {
					case 'last':
						if (isNotNumber(group.value)) return;
						
						obj.range = {};
						obj.range[fieldName] = {};
						obj.range[fieldName]['gte'] = 'now-' + group.value + 'd';
						obj.range[fieldName]['lte'] = 'now';
						break;
					
					case 'next':
						if (isNotNumber(group.value)) return;
						
						obj.range = {};
						obj.range[fieldName] = {};
						obj.range[fieldName]['gte'] = 'now';
						obj.range[fieldName]['lte'] = 'now+' + group.value + 'd';
						break;
					
					case 'equals':
						var parsed = validateDate(group.date);
						if (!parsed) return;
							
						obj.range = {};
						obj.range[fieldName] = {};
						obj.range[fieldName]['gte'] = parsed + 'T00:00:00';
						obj.range[fieldName]['lte'] = parsed + 'T23:59:59';
						break;
						
					case 'gt':
					case 'gte':
						var parsed = validateDate(group.date);
						if (!parsed) return;
						
						obj.range = {};
						obj.range[fieldName] = {};
						obj.range[fieldName][group.subType] = parsed + 'T00:00:00';
						break;
					
					case 'lt':
					case 'lte':
						var parsed = validateDate(group.date);
						if (!parsed) return;
						
						obj.range = {};
						obj.range[fieldName] = {};
						obj.range[fieldName][group.subType] = parsed + 'T23:59:59';
						break;
				}
				break;
				
			case 'multi':
				break;
				
			default:
				throw new Error('Unexpected type');
		}
		return obj;
	}

	function getFilterTemplate(type) {
		var templates = {
			group : {
				type : 'group',
				subType : '',
				rules : [],
			},
			item : {
				field : '',
				subType : '',
				value : '',
			},
			number : {
				field : '',
				subType : '',
				value : null,
			}
		};

		return angular.copy(templates[type]);
	}
	
	function isNotNumber(value) {
		return value === undefined || value === null || Number.isNaN(value);
	}
	
	function isUndefinedOrNull(value) {
		return value === undefined || value === null;
	}
	
	function validateDate(date) {
		if (!angular.isString(date)) return false;
		
		var parts = date.split("/");
		var formatedDate = parts[2] + '-' + parts[1] + '-' + parts[0];
		var time = Date.parse(formatedDate);
		
		if (Number.isNaN(time)) return false;

		return formatedDate;
	}

})(window.angular);
