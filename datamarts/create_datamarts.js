var fs = require('fs');
var nconf  = require('nconf');
var webdriver = require('selenium-webdriver');
var sleep = require('sleep-promise');
var build_driver = require('../util/build_driver.js');
var By = webdriver.By;
var until = webdriver.until;

nconf.file({
    file: 'config.json'
});

var POPMEDNET_URLS = nconf.get('popmednet_urls:' + nconf.get('server'));

var exports = module.exports = {};

exports.createDataMart = function(oName, oAcronym, type, callback) {
    console.log('Creating datamart (' + oName + " " + type + ', ' + oAcronym + ').');

    if (type === "QE DataMart") {
        oAcronym = oAcronym + "QE";
    } else if (type === "Legacy DataMart") {
        oAcronym = oAcronym + "LG"
    }

    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.dm_creation_url, function(driver) {
        driver.wait(function waitForButton() { return driver.findElement(By.id('btnSave')).isDisplayed(); }, 5000)
              .then(function() {
                  driver.findElement(By.id('txtName')).sendKeys(oName + " " + type);
                  driver.findElement(By.id('txtAcronym')).sendKeys(oAcronym);
                  driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//li[@role='option' and text()='" + oName + "']")));

                  // only set the PCORnet CDM thing only if it's a QE DataMart
                  if (type === "QE DataMart") {
                      driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//ul[@id='cboAdapter_listbox']//li[@role='option' and text()='PCORnet CDM']")));
                  }

                  driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//a[@class='k-link' and text()='Installed Models']")));
                  driver.wait(function() { return driver.findElement(By.id('btnInstallModel')).isDisplayed(); }, 5000)
                        .then(function() {
                            driver.findElement(By.id('btnInstallModel')).click();
                            driver.wait(function() { return driver.findElement(By.id('00bf515f-6539-405b-a617-ca9f8aa12970')).isDisplayed(); }, 5000)
                                  .then(function() {
                                      driver.findElement(By.id('00bf515f-6539-405b-a617-ca9f8aa12970')).click();
                                      driver.wait(until.elementLocated(By.xpath("//td[text()='File Distribution']")))
                                            .then(function() {
                                                driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 5000)
                                                      .then(function() {
                                                          console.log('Datamart created (' + oName + " " + type + ', ' + oAcronym + ').');
                                                          driver.quit();
                                                          callback();
                                                      });
                                            });
                                  });
                        });
              });
    });
}

exports.fixDataMart = function(dm, callback) {
    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.d)
}
