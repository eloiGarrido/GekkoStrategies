// helpers
// var _ = require("lodash");
var log = require("../core/log.js");

// configuration
var config = require("../core/util.js").getConfig();
var settings = config.TTM;

function divideBy(object, divider) {
  return object.map(value => {
    return value / 2;
  });
  // if (typeof object == "number") return object / divider;
  // for (let i in object) {
  //   if (object.hasOwnProperty(i)) {
  //     object[i] = divideBy(object[i], divider);
  //   }
  // }
  // return object;
}

// Let's create our own strategy
let strat = {
  // Prepare everything our strat needs
  init: function() {
    this.name = "TTM";
    log.debug("Initializing...");

    this.addTulipIndicator("bbands", "bbands", {
      optInTimePeriod: settings.bbPeriod,
      optInNbStdDevs: settings.bbStdDev
    });
    this.addTulipIndicator("ema", "ema", {
      optInTimePeriod: settings.emaPeriod
    });
    this.addTulipIndicator("sma", "sma", {
      optInTimePeriod: settings.smaPeriod
    });
    this.addTulipIndicator("atr", "atr", {
      optInTimePeriod: settings.atrPeriod
    });
    this.addTulipIndicator("linreg", "linreg", {
      optInTimePeriod: settings.linregPeriod
    });
    log.debug("indicators loaded");

    this.bbMult = settings.bbMult || 2;
    this.keltnerMult = settings.keltnerMult || 1;

    this.highest = [];
    this.lowest = [];
    this.e1 = [];
    this.close = [];

    log.debug("Done with initialization");
  },

  getKeltner: function() {
    var keltnerBands = [];
    // Lower Channel Line: 20-day EMA - (2 x ATR(10))
    keltnerBands.push(
      this.tulipIndicators.ema.result -
        this.keltnerMult * this.tulipIndicators.atr.result
    );
    // Middle Channel
    keltnerBands.push(this.tulipIndicators.ema.result);
    // Upper Channel Line: 20-day EMA + (2 x ATR(10))
    keltnerBands.push(
      this.tulipIndicators.ema.result +
        this.keltnerMult * this.tulipIndicators.atr.result
    );
    return keltnerBands;
  },

  addToHighest: function(val) {
    var maxLenght = settings.length * 2;
    this.highest.push(val);
    if (this.highest.length > maxLenght) {
      this.highest.shift();
    }
  },

  getHighest: function() {
    return Math.max(this.highest);
  },

  getLowest: function() {
    return Math.max(this.lowest);
  },

  addToLowest: function(val) {
    var maxLenght = settings.length * 2;
    this.lowest.push(val);
    if (this.lowest.length > maxLenght) {
      this.lowest.shift();
    }
  },

  addToClose: function(val) {
    var maxLenght = settings.length * 2;
    this.close.push(val);
    if (this.close.length > maxLenght) {
      this.close.shift();
    }
  },

  getClose: function(length) {
    let reverseClose = this.close.reverse();
    return reverseClose.splice(0, length);
  },

  getOsc: function() {
    let length = settings.length;
    let e1Array = this.getE(length);
    let e1Array2 = divideBy(e1Array, 2);

    let closeArray = this.getClose(length);

    let oscArray = [];
    for (let i = 0; i < length; i++) {
      oscArray.push(closeArray[i] - e1Array2[i]);
    }

    return this.tulipIndicators.linreg(oscArray, { optInTimePeriod: length });
  },

  getE: function(length) {
    let reverseE = this.e1.reverse();
    return reverseE.splice(0, length);
  },

  addToE: function(val) {
    var maxLenght = settings.length * 2;
    this.e1.push(val);
    if (this.e1.length > maxLenght) {
      this.e1.shift();
    }
  },

  // For debugging purposes.
  log: function() {
    // your code!
    var bbands = this.tulipIndicators.bbands;
    var ema = this.tulipIndicators.ema;
    var sma = this.tulipIndicators.sma;
    var atr = this.tulipIndicators.atr;
    // Log indicator values
    log.debug("BB:", bbands.result);
    log.debug("EMA:", ema.result);
    log.debug("SMA:", sma.result);
    log.debug("ATR:", atr.result);
  },

  // What happens on every new candle?
  update: function(candle) {
    this.addToHighest(candle.high);
    this.addToLowest(candle.low);
    this.addToClose(candle.close);

    let highest = this.getHighest();
    let lowest = this.getLowest();
    // let sma = this.indicators.sma.result;
    let sma = this.tulipIndicators.sma.result;
    log.debug("sma", sma);

    let e1 = (highest + lowest) / 2 + sma;
    log.debug("e1", e1);
    this.addToE(e1);
  },

  // Based on the newly calculated
  // information, check if we should
  // update or not.
  check: function(candle) {
    // your code!
    let keltner = this.getKeltner();
    let bbands = this.tulipIndicators.bbands.result;

    let diffLow = bbands.bbandsLower - keltner[0];
    let diffHigh = bbands.bbandsUpper - keltner[2];
    log.debug("diffLow", diffLow);
    log.debug("diffHigh", diffHigh);

    // highest() Highest value for a given number of bars back
    // lowest() Lowest value for a given number of bars back
    // let e1 = (this.getHighest() + this.getLowest()) / 2 + this.indicators.sma;
    // log.debug("E1", e1);

    // this.addToOsc(e1);
    let osc = this.getOsc();
    log.debug("osc", osc);
    // e1 = (highest(high, length) + lowest(low, length)) / 2 + sma(close, length)
    // osc = linreg(close - e1 / 2, length, 0)
    // osc_color = osc[1] < osc[0] ? osc[0] >= 0 ? #00ffff : #cc00cc : osc[0] >= 0 ? #009b9b : #ff9bff
    // alert = strict and diff < 0 ? true : not strict and kupper > upper and klower < lower ? true : false
    // mid_color = alert ? red : green
  },

  // Optional for executing code
  // after completion of a backtest.
  // This block will not execute in
  // live use as a live gekko is
  // never ending.
  end: function() {
    // your code!
  }
};
module.exports = strat;

// length = input(title="Length", type=integer, defval=20, minval=0)
// bband(length, mult) =>
// 	sma(close, length) + mult * stdev(close, length)
// keltner(length, mult) =>
// 	ema(close, length) + mult * ema(tr, length)

// e1 = (highest(high, length) + lowest(low, length)) / 2 + sma(close, length)
// osc = linreg(close - e1 / 2, length, 0)
// diff = bband(length, 2) - keltner(length, 1)
// osc_color = osc[1] < osc[0] ? osc[0] >= 0 ? #00ffff : #cc00cc : osc[0] >= 0 ? #009b9b : #ff9bff
// mid_color = diff >= 0 ? green : red

// plot(osc, color=osc_color, style=histogram, linewidth=2)
// plot(0, color=mid_color, style=circles, linewidth=3)

//======================================================================

// strict = input(true, title="Enabled (original) or Disabled (strict)")
// length = input(20, minval=1, title="BB Length")
// /// ### ORIGINAL TTM ### ///

// bband(length, mult) => sma(close, length) + mult * stdev(close, length)
// keltner(length, mult) => ema(close, length) + mult * ema(tr, length)

// diff = bband(length, 2) - keltner(length, 1)

// /// ### BOLLINGER BANDS ### ///

// src = input(close, title="Source")
// mult = input(2.0, minval=0.001, maxval=50, title="StDev")
// basis = sma(src, length)
// dev = mult * stdev(src, length)
// upper = basis + dev
// lower = basis - dev

// /// ### KELTNER CHANNELS ### ///

// useTrueRange = input(true)
// klength = input(20, minval=1, title="Keltner Length")
// kmult = input(1.0, title="Multiplier")
// ksrc = input(close, title="Keltner Source")

// ma = ema(src, klength)
// range = useTrueRange ? tr : high - low
// rangema = ema(range, klength)
// kupper = ma + rangema * kmult
// klower = ma - rangema * kmult
// c = blue

// /// ### CALCULATIONS ### ///

// e1 = (highest(high, length) + lowest(low, length)) / 2 + sma(close, length)
// osc = linreg(close - e1 / 2, length, 0)
// osc_color = osc[1] < osc[0] ? osc[0] >= 0 ? #00ffff : #cc00cc : osc[0] >= 0 ? #009b9b : #ff9bff
// alert = strict and diff < 0 ? true : not strict and kupper > upper and klower < lower ? true : false
// mid_color = alert ? red : green

// /// ### PLOTS ### ///

// plot(osc, color=osc_color, style=histogram, linewidth=2)
// plot(0, color=mid_color, style=circles, linewidth=3)

// /// ### ALERT ### ///

// alertcondition(alert, title= "CTTV Squeeze", message="Squeeze alert")

// #### VWAP #####
// // required indicators
// // Simple Moving Average - O(1) implementation

// var Indicator = function() {
//     this.input = 'candle';
//     this.result = 0;
//     this.typicalPrice = 0;
//     this.volume = 0;
//   }

//   Indicator.prototype.update = function(candle) {
//     if(candle.start.utc().format('HH:mm:ss') === '00:00:00') {
//       this.typicalPrice = 0;
//       this.volume = 0;
//     }
//     this.typicalPrice += ((candle.high+candle.low+candle.close)/3) * candle.volume;
//     this.volume += candle.volume;
//     this.result = this.typicalPrice / this.volume;
//   }

//   module.exports = Indicator;
