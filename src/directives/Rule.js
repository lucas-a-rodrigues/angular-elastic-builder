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
