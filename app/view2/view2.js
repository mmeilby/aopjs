'use strict';

angular.module('aop.view2', ['ngRoute', 'ngMaterial', 'ngMessages'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/bnpl', {
    templateUrl: 'view2/view2.html',
    controller: 'View2Ctrl'
  });
}])

.controller('View2Ctrl', function($scope, Calculator) {
  $scope.selectedPeriod = 1
  $scope.loanDetails = {
    principal: 100000,
    interval: 12,
  }
  $scope.financeOptions = {
    costs: 1800,
    periods: [
      {
        periods: 6,
        interest: 0,
        payment: 0,
        fee: 0,
        usePayment: true,
      },
      {
        periods: 24,
        interest: 10,
        payment: 0,
        fee: 25,
        usePayment: false,
      }
    ],
    includeCost: true,
    roundedPayment: false
  }
  $scope.$watch(() => JSON.stringify($scope.financeOptions), (newValue, oldValue) => {
    if (newValue !== oldValue) {
      recalc()
    }
  });
  $scope.$watch(() => JSON.stringify($scope.loanDetails), (newValue, oldValue) => {
    if (newValue !== oldValue) {
      recalc()
    }
  });
  recalc()
  $scope.recalc = () => recalc()
  function recalc() {
    const r = $scope.financeOptions.periods[$scope.selectedPeriod].interest / $scope.loanDetails.interval / 100
    const plan = Calculator.cfw($scope.loanDetails.principal, $scope.loanDetails.interval, $scope.financeOptions)
    const cashflow = plan.cashflow
    $scope.npv = Calculator.npv(cashflow, r)
    $scope.irr = Calculator.irr(cashflow, 0.1)
    $scope.eir = Calculator.eir($scope.financeOptions.periods[$scope.selectedPeriod].interest / 100, $scope.loanDetails.interval)
    $scope.aop = Calculator.aop(cashflow, 0.1, $scope.loanDetails.interval)
    $scope.plan = plan
  }
});
