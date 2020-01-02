'use strict';

// Declare app level module which depends on views, and core components
angular.module('aop', [
  'ngRoute',
  'aop.view1',
  'aop.view2',
  'aop.calc',
  'aop.version'
]).
config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');

  $routeProvider.otherwise({redirectTo: '/annuity'});
}]);
