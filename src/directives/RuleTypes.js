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
