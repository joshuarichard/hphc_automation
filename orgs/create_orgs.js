var fs = require('fs');
var nconf = require('nconf');
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

exports.createParent = function(pName, pAcronym, children, callback) {
    console.log('INFO: Creating parent (' + pName + ', ' + pAcronym + ').');

    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.org_creation_url, function(driver) {
        // fill in form
        driver.wait(function() { return driver.findElement(By.id('btnSave')).isDisplayed(); }, 5000)
              .then(function() {
                  driver.findElement(By.id('txtName')).sendKeys(pName);
                  driver.findElement(By.id('txtAcronym')).sendKeys(pAcronym);
                  driver.findElement(By.id('btnSave')).click();
                  driver.wait(sleep(2000), 4000)
                        .then(function() {
                            driver.findElements(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]"))
                                  .then(function(confirmed) {
                                      if (confirmed.length === 0) { driver.findElement(By.id('btnSave')).click(); } // click save a second time if it wasn't clicked the first time

                                      driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 5000)
                                            .then(function() {
                                                console.log('INFO: Parent created (' + pName + ', ' + pAcronym + ').');
                                                driver.quit();

                                                var children_created = 0;
                                                children.forEach(function(cName, index) {
                                                    exports.createChild(cName, pName, pAcronym, function() {
                                                        children_created++;
                                                        if (children_created == children.length) {
                                                            callback();
                                                        }
                                                    });
                                                });
                                            });
                                  });
                        });
            });
    });
}

exports.createChild = function(cName, pName, pAcronym, callback) {
    var cAcronym = pAcronym + cName.split('-')[1];
    console.log('INFO: Creating child (' + cName + ', ' + cAcronym + ') with parent (' + pName + ', ' + pAcronym + ').');

    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.org_creation_url, function(driver) {
        // fill in form
        driver.wait(function() { return driver.findElement(By.id('txtName')).isDisplayed(); }, 5000)
              .then(function() {
                  driver.findElement(By.id('txtName')).sendKeys(cName);
                  driver.findElement(By.id('txtAcronym')).sendKeys(cAcronym);
                  driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//li[@role='option' and text()='" + pName + "']")));
                  driver.findElement(By.id('btnSave')).click();
                  driver.wait(sleep(2000), 4000)
                        .then(function() {
                            driver.findElements(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]"))
                                  .then(function(confirmed) {
                                      if (confirmed.length === 0) { driver.findElement(By.id('btnSave')).click(); } // click save a second time if it wasn't clicked the first time
                                      driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 10000)
                                            .then(function() {
                                                console.log('INFO: Child created (' + cName + ', ' + cAcronym + ') with parent (' + pName + ', ' + pAcronym + ').');
                                                driver.quit();
                                                callback();
                                    });
                            });
                         });
            });
    });
}
