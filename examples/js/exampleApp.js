(function(angular) {

  var app = angular.module('exampleApp', [
    'angular-elastic-builder',
  ]);

  app.controller('BasicController', function() {

    var data = this.data = {};

    data.query = [
      {
        'and': [
          {
            'range': {
              'test.number': {
                'gte': 650
              }
            }
          },
          {
            'range': {
              'test.number': {
                'lt': 850
              }
            }
          },
          {
            'range': {
              'test.date': {
                'gte': '2016-03-10 00:00:00',
                'lte': '2016-03-10 23:59:59'
              }
            }
          }
        ]
      },
      {
        'term': {
          'test.boolean': 'S'
        }
      },
      {
        'terms': {
          'test.state.multi': [ 'AZ', 'CT' ]
        }
      },
      {
        'not': {
          'filter': {
            'term': {
              'test.term': 'asdfasdf'
            }
          }
        }
      },
      {
        'exists': {
          'field': 'test.term'
        }
      }
    ];

    data.fields = {
      'test.number': { type: 'number', minimum: 650 },
      'test.term': { type: 'term' },
      'test.boolean': { type: 'boolean' },
      'test.date': { type: 'date' },
      'test.state.multi': { type: 'multi', choices: [ 'AZ', 'CA', 'CT' ]}
    };

    data.needsUpdate = true;

    this.showQuery = function() {
      var queryToShow = {
        size: 0,
        filter: { and : data.query }
      };

      return JSON.stringify(queryToShow, null, 2);
    };

  });

})(window.angular);
