/**
 * create_orgs.js
 *
 * Module that manages organization creation.
 */

var fs = require('fs');
var nconf = require('nconf');
var webdriver = require('selenium-webdriver');
var sleep = require('sleep-promise');
var build_driver = require('../util/build_driver.js');
var colors = require('colors/safe');
var By = webdriver.By;
var until = webdriver.until;

nconf.file({
    file: 'config.json'
});

var POPMEDNET_URLS = nconf.get('popmednet_urls:' + nconf.get('server'));

var exports = module.exports = {};

/**
 * Creates a parent organization. Child organizations get created after each parent.
 * (steps 1-3 of the wiki)
 * @param {String} pName - The name for this parent organization.
 * @param {String} pAcronym - The acronym for this parent organization.
 * @param {Array.String} children - The child names to create for this parent.
 * @callback {createParentCallback} callback - The callback that resolves this function.
 */
exports.createParent = function(pName, pAcronym, children, callback) {
    console.log(colors.yellow('INFO:') + ' Creating parent (' + pName + ', ' + pAcronym + ').');

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
                                                console.log(colors.green('INFO:') + ' Parent created (' + pName + ', ' + pAcronym + ').');
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

/**
 * Creates a child organization. (step 4 of the wiki)
 * @param {String} cName - The name for this child organization.
 * @param {String} pName - The name for this child's parent organization.
 * @param {String} pAcronym - The acronym for this child's parent organization.
 * @callback {createChildCallback} callback - The callback that resolves this function.
 */
exports.createChild = function(cName, pName, pAcronym, callback) {
    var cAcronym = pAcronym + cName.split('-')[1];
    console.log(colors.yellow('INFO:') + ' Creating child (' + cName + ', ' + cAcronym + ') with parent (' + pName + ', ' + pAcronym + ').');

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
                                                console.log(colors.green('INFO:') + ' Child created (' + cName + ', ' + cAcronym + ') with parent (' + pName + ', ' + pAcronym + ').');
                                                driver.quit();
                                                callback();
                                    });
                            });
                         });
            });
    });
}
