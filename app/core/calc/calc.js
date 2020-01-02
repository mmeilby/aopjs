/*
    ÅOP calculator

    ÅOP is annual internal rate of return for the repayment of a loan including all costs.
    To find IRR the rate is approximated to make NPV close to 0 using newtons method.

    Use:
        // Make payment plan
        var plan = PaymentPlan(payment, fee, interest, costs, principal);
        // Setup money flow - first element is the loan
        var flow = [ -principal ];
        // - the rest are the payments each month
        plan.paymentplan.forEach(function (p, index, array) {
            flow.push(p.payment);
        });
        // Find IRR
        var irr = IRR(flow, interest);
        // Calculate ÅOP
        var aop = (Math.pow(1 + irr, 12) - 1) * 100;

        Verify results with http://www.laaneberegner.nu or http://www.bankinfo.dk/aaopberegner.asp

    References:
        https://answers.acrobatusers.com/Formula-loan-interest-rate-q176800.aspx
        http://www.studieportalen.dk/kompendier/matematik/formelsamling/rentesregning/aaop
        http://www.investopedia.com/ask/answers/021115/what-formula-calculating-net-present-value-npv-excel.asp
        https://gist.github.com/ghalimi/4591338
        http://financeformulas.net/Banking-Formulas.html
*/

// tslint:disable:max-line-length
angular.module('aop.calc', [])

.factory('Calculator', function () {
  return {
    aop: (cashflow, rate, ppy) => EIR(IRR(cashflow, rate), ppy),
    npv: (cashflow, rate) => NPV(cashflow, rate),
    irr: (cashflow, rate) => IRR(cashflow, rate),
    eir: (rate, ppy) => EIR(rate / ppy, ppy),
    pmt: (p, rate, n) => p * apf(rate, n),
    cfw: (p, ppy, options) => cashflow(p, ppy, options)
  }
})
/**
 * EIR - Effective Interest Rate
 * @param rate - nominal periodical rate
 * @param ppy - number of periods per year - zero if continuous
 * @returns {number} - effective annual rate
 */
function EIR(rate, ppy) {
  return ppy ? Math.pow(1 + rate, ppy) - 1 : Math.exp(rate) - 1
}
/**
 * APF - Annuity Principal Factor
 * Return factor for fixed annuity payment. The factor will be a fraction of the principal to pay each period.
 * If the interest rate is zero the factor will be 1/n for linear repayment.
 * The factor will allow the principal to be fully repayed after the specified number of periods.
 * @param rate - nominal periodical rate
 * @param n - number of periods
 * @returns {number}
 */
function apf(rate, n) {
  return rate > 0 ? rate / (1 - Math.pow(1 + rate, -n)) : (n > 0 ? 1 / n : 1)
}
/**
 * NPV - Net Present Value
 * @param cashflow
 * @param rate - nominal periodical rate
 * @returns {number} - net present value for cashflow
 */
function NPV(cashflow, rate) {
  const r = rate + 1
  return cashflow.reduce((NPVn, CFn, i) => i > 0 ? NPVn + CFn / Math.pow(r, i) : CFn)
}
/**
 * NPV - Net Present Value - first order derivation
 * @param cashflow
 * @param rate - nominal periodical rate
 * @returns {number} - net present value for cashflow
 */
function dNPV(cashflow, rate) {
  const r = rate + 1
  return cashflow.reduce((NPVn, CFn, i) => i > 0 ? NPVn - i * CFn / Math.pow(r, i + 1) : 0)
}
/**
 * IRR - Internal Rate of Return
 * Internal Rate of Return (IRR) is the rate of return at which the net present value of a project (cashflow) becomes zero.
 * They call it ‘internal’ because it does not take any external factor (like inflation) into consideration.
 * Ref: https://cleartax.in/s/internal-rate-of-return-irr/
 * Ref: https://en.wikipedia.org/wiki/Internal_rate_of_return
 * @param cashflow
 * @param initialguess - periodical rate as seed
 * @returns {number} - periodical internal rate of return
 */
function IRR(cashflow, initialguess) {
  // Set maximum epsilon for end of iteration
  const epsMax = 1e-10;
  // Set maximum number of iterations
  const iterMax = 50;
  // Check that money flow contains at least one positive value (payment) and one negative value (loan)
  if (cashflow.some((CFn) => CFn > 0) && cashflow.some((CFn) => CFn < 0)) {
    let irr = (typeof initialguess === "undefined") ? 0.1 : initialguess
    // Implement Newton's method
    for (let iteration = 0; iteration < iterMax; iteration++) {
      const npv = NPV(cashflow, irr);
      const irr2 = irr - npv / dNPV(cashflow, irr);
      const dirr = Math.abs(irr2 - irr);
      irr = irr2;
      // Stop if IRR almost does not change or NPV is close to zero (optimal IRR)
      if ((dirr < epsMax) || (Math.abs(npv) < epsMax)) {
        return irr
      }
    }
  }
  return NaN;
}

/**
 * cashflow - make cash flow for the desired loan configuration
 * More periods can be defined however, all except one period must have fixed periodical payment.
 * @param p - principal - the loan amount to amortize
 * @param ppy - payments per year - should be 1, 2, 4, 12 or 365
 * @param options - options to configure the cash flow
 *          costs: the initial cost to obtain the loan.
 *          includeCost: flag for including the cost in the principal. Otherwise the cost will be added to the first period.
 *          roundedPayment: round periodical payments to the higher integer.
 *          periods: period blocks list - one for each period block
 *              periods: number of periods in this block - can be omitted when there is only one block and fixed payment
 *              interest: interest rate used for this block
 *              payment: fixed payment if requested
 *              fee: periodical fee added to the payment
 *              usePayment: use fixed payment for this block of periods
 * @returns {{duration: *, principal: *, paymentplan: *, totalinterest: *, cashflow: number[], totalpayed: *}}
 */
function cashflow(p, ppy, options) {
  const opt = options || {
    costs: 1800,
    periods: [{
      periods: 24,
      interest: 10,
      payment: 0,
      fee: 25,
      usePayment: false,
    }],
    includeCost: true,
    roundedPayment: false
  }
  const principal = p + (opt.includeCost ? opt.costs : 0);
  const paymentplan = [];

  let loanPeriods = []
  if (opt.periods) {
    const apfs = opt.periods.map((period, index) => apf(period.interest / 100 / ppy, period.periods))
    // array of repayments: Pj - Pj+1/(1+i)^n
    const deltaPrincipals = opt.periods.map((period, index) => period.usePayment ? period.payment / apfs[index] : -1)

    const principalsForw = [principal]
    for (const index in deltaPrincipals) {
      const dP = deltaPrincipals[index]
      if (dP < 0) {
        break
      }
      else {
        const P = (principalsForw[index] - dP) * Math.pow(1 + opt.periods[index].interest / 100 / ppy, opt.periods[index].periods)
        principalsForw.push(P)
      }
    }
    const principalsRev = [0]
    for (const index in deltaPrincipals) {
      const indexRev = deltaPrincipals.length - index - 1
      const dP = deltaPrincipals[indexRev]
      if (dP < 0) {
        break
      }
      else {
        const P = dP + principalsRev[0] / Math.pow(1 + opt.periods[indexRev].interest / 100 / ppy, opt.periods[indexRev].periods)
        principalsRev.unshift(P)
      }
    }
    const principals = principalsForw.concat(principalsRev)
    let end = 0
    loanPeriods = opt.periods.map((period, index) => {
      end += period.periods
      let payment = period.usePayment ? period.payment : (principals[index] - principals[index + 1] / Math.pow(1 + period.interest / 100 / ppy, period.periods)) * apfs[index]
      if (!period.usePayment && opt.roundedPayment) {
        payment = Math.ceil(payment);
      }
      return {
        interest: period.interest / 100 / ppy,
        fee: period.fee,
        payment: payment,
        end: end
      }
    })
  }

  let balance = principal
  let i = 0;
  while (i <= 180 && balance >= 0.01) {
    let monthlyPayment = 0
    let monthlyinterest = 0
    let monthlyfee = 0
    const per = loanPeriods.find((period) => i < period.end)
    if (per) {
      monthlyPayment = per.payment
      monthlyinterest = per.interest * balance;
      monthlyfee = per.fee;
    }
    else {
      break
    }
    let paym = monthlyPayment + monthlyfee
    let repayment = monthlyPayment - monthlyinterest
    if (!i && !opt.includeCost) {
      paym += opt.costs
      monthlyfee += opt.costs
    }
    i++
    if (balance > repayment) {
      balance -= repayment
      paymentplan.push({
        i,
        repayed: repayment,
        fee: monthlyfee,
        interest: monthlyinterest,
        payment: paym,
        balance
      })
    } else {
      paymentplan.push({
        i,
        repayed: balance,
        fee: monthlyfee,
        interest: monthlyinterest,
        payment: balance + monthlyinterest + monthlyfee,
        balance: 0
      })
      balance = 0
    }
  }
  return {
    duration: i,
    principal,
    totalpayed: paymentplan.reduce((total, plan) => total + plan.payment, 0),
    totalinterest: paymentplan.reduce((total, plan) => total + plan.interest, 0),
    paymentplan,
    cashflow: [-p].concat(paymentplan.map((plan) => plan.payment))
  };
}
