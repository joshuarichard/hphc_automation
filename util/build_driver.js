/**
 * build_driver.js
 *
 * Module that returns a built and logged in selenium driver for use.
 */

var fs = require('fs');
var nconf = require('nconf');
var webdriver = require('selenium-webdriver');
var By = webdriver.By;
var until = webdriver.until;

nconf.file({
    file: 'config.json'
});

var POPMEDNET_USERNAME = nconf.get('credentials:username');
var POPMEDNET_PASSWORD = nconf.get('credentials:password');

var exports = module.exports = {};

/**
 * Builds a selenium driver using the specified browser. Signs into the server
 * and returns the logged in driver.
 * @callback {buildDriverAndSignInCallback} callback - The callback that uses the driver.
 * @return {SeleniumDriver} The logged in selenium driver.
 */
exports.buildDriverAndSignIn = function(url, callback) {
    // init webdriver
    var driver = new webdriver.Builder().forBrowser(nconf.get("driver")).build();

    // sign in
    driver.get(url);
    driver.findElement(By.id('txtUserName')).sendKeys(POPMEDNET_USERNAME);
    driver.findElement(By.id('txtPassword')).sendKeys(POPMEDNET_PASSWORD);
    driver.findElement(By.className('btn btn-primary'))
          .click()
          .then(function() {
              callback(driver);
          });
}
