'use strict';

angular.module('aop.version', [
  'aop.version.interpolate-filter',
  'aop.version.version-directive'
])

.value('version', '0.1');
