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
