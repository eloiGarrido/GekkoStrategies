/**
 * Created by eGarrido on 19/08/18
 */

const _ = require('lodash');
const log = require('../core/log');
const util = require('../core/util');
const config = util.getConfig();
// const pubnubConfig = config.pubnub;
const pubnubConfig = {
  publishKey: 'pub-c-29496b22-b455-4bab-ab59-df90ab1433f6',
  subscribeKey: 'sub-c-7948417c-9b46-11e8-84a1-9640bd3b0340',
};

const PubNubLib = require('pubnub');

let Pubnub = function(name, candleSize, done) {
  _.bindAll(this);
  this.pubnub;
  this.done = done;
  this.name = name || 'default';
  this.candleSize = '60' || candleSize;
  this.price = 'N/A';
  this.channel = pubnubConfig.channel || 'gekkoStrategy';
  this.setup();
};

Pubnub.prototype.setup = function(done) {
  this.pubnub = new PubNubLib({
    publishKey: pubnubConfig.publishKey,
    subscribeKey: pubnubConfig.subscribeKey,
  });

  log.info('PubNub plugin enabled');
  this.publish('Initialization finished');
};

Pubnub.prototype.processCandle = function(candle) {
  this.price = candle.close;
};

Pubnub.prototype.processAdvice = function(advice) {
  const msg = `${config.watch.asset}: ${advice} at ${this.price}`;
  this.publish(msg);
};

Pubnub.prototype.publish = function(message) {
  if (this.channel === undefined) {
    log.error('Channel is not defined');
  }
  this.pubnub.publish({
    message: {
      title: `${this.name}-${this.candleSize}`,
      description: message,
    },
    channel: this.channel,
    sendByPost: false,
    storeInHistory: false,

    function(status, response) {
      if (status.error) {
        log.error(error);
      } else {
        log.debug('Message published w/ timetoken', response.timetoken);
      }
    },
  });
};

module.exports = Pubnub;
