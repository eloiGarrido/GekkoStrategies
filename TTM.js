// helpers
var _ = require('lodash');
var log = require('../core/log.js');

// configuration
var config = require('../core/util.js').getConfig();
var settings = config.EMADIV;

// Let's create our own strategy
var strat = {
    // Prepare everything our strat needs
    init: function() {
        this.name = 'TTM';

        this.addTulipIndicator('bbands', 'BBANDS', settings.bbands);
        this.addTulipIndicator('ema', 'EMA', settings.ema);
        this.addTulipIndicator('sma', 'SMA', settings.sma);
        this.addTulipIndicator('atr', 'ATR', settings.atr);

        this.bbMult = settings.bbMult || 2;
        this.keltnerMult = settings.keltnerMult || 1;

        this.highest = []
    },

    getKeltner: function(){
        var keltnerBands = [];
        // Lower Channel Line: 20-day EMA - (2 x ATR(10))
        keltnerBands.push(this.indicators.ema() - (this.keltnerMult * this.indicators.atr()));
        // Middle Channel
        keltnerBands.push(this.indicators.ema());
        // Upper Channel Line: 20-day EMA + (2 x ATR(10))
        keltnerBands.push(this.indicators.ema() + (this.keltnerMult * this.indicators.atr()));
        return keltnerBands;
    },

    // What happens on every new candle?
    update : function(candle) {
        // your code!
    },

    addToHighest: function(val){
        var maxLenght = settings.length;
        this.highest.push(val);
        if(this.highest.length > maxLenght){
            this.highest.shift();
        }
    },

    getHighest: function(){
        return Math.max(this.highest);
    },

    getLowest: function(){
        return Math.max(this.lowest);
    },

    addToLowest: function(val){
        var maxLenght = settings.length;
        this.lowest.push(val);
        if(this.lowest.length > maxLenght){
            this.lowest.shift();
        }
    },

    // For debugging purposes.
    log :function() {
        // your code!
        var bbands = this.indicators.bbands; 
        var ema = this.indicators.ema; 
        var sma = this.indicators.sma; 
        var atr = this.indicators.atr; 
        // Log indicator values
        log.debug('BB:', bbands.toFixed(8));
        log.debug('EMA:', ema.toFixed(8));
        log.debug('SMA:', sma.toFixed(8));
        log.debug('ATR:', atr.toFixed(8));

    },

    // Based on the newly calculated
    // information, check if we should
    // update or not.
    check: function(candle) {
        // your code!
        var keltner = this.getKeltner();
        var bbands = this.indicators.bbands;

        var diffLow = bbands[0] - keltner[0];
        var diffHigh = bbands[2] - keltner[2];

        // highest() Highest value for a given number of bars back
        // lowest() Lowest value for a given number of bars back
        var e1 = (this.getHighest() + this.getLowest())/2 + this.indicators.sma;
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
}
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

strict = input(true, title="Enabled (original) or Disabled (strict)")
length = input(20, minval=1, title="BB Length")
/// ### ORIGINAL TTM ### ///

bband(length, mult) => sma(close, length) + mult * stdev(close, length)
keltner(length, mult) => ema(close, length) + mult * ema(tr, length)
	
diff = bband(length, 2) - keltner(length, 1)


/// ### BOLLINGER BANDS ### ///

src = input(close, title="Source")
mult = input(2.0, minval=0.001, maxval=50, title="StDev")
basis = sma(src, length)
dev = mult * stdev(src, length)
upper = basis + dev
lower = basis - dev


/// ### KELTNER CHANNELS ### ///

useTrueRange = input(true)
klength = input(20, minval=1, title="Keltner Length")
kmult = input(1.0, title="Multiplier")
ksrc = input(close, title="Keltner Source")

ma = ema(src, klength)
range = useTrueRange ? tr : high - low
rangema = ema(range, klength)
kupper = ma + rangema * kmult
klower = ma - rangema * kmult
c = blue


/// ### CALCULATIONS ### ///

e1 = (highest(high, length) + lowest(low, length)) / 2 + sma(close, length)
osc = linreg(close - e1 / 2, length, 0)
osc_color = osc[1] < osc[0] ? osc[0] >= 0 ? #00ffff : #cc00cc : osc[0] >= 0 ? #009b9b : #ff9bff
alert = strict and diff < 0 ? true : not strict and kupper > upper and klower < lower ? true : false
mid_color = alert ? red : green

/// ### PLOTS ### ///

plot(osc, color=osc_color, style=histogram, linewidth=2)
plot(0, color=mid_color, style=circles, linewidth=3)

/// ### ALERT ### ///

alertcondition(alert, title= "CTTV Squeeze", message="Squeeze alert")


