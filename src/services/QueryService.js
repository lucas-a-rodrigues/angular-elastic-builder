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
