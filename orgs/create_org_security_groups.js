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

exports.assignSecurityGroup = function(oName, uid, adminType, callback) {
    console.log('INFO: Assigning security group (' + oName + ') the type ' + adminType + '.');

    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.org_security_groups_creation_url + uid, function(driver) {
        driver.wait(function() { return driver.findElement(By.id('txtName')).isDisplayed(); }, 5000).then(function() {
            driver.findElement(By.id('txtName')).clear();
            driver.findElement(By.id('txtName')).sendKeys(adminType);
            driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//li[@role='option' and text()='DataMart Administrators']")));
            driver.findElement(By.id('btnSave')).click();
            driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 5000)
                  .then(function() {
                      console.log('INFO: Security group assigned (' + oName + ') assigned ' + adminType + '.');
                      driver.quit();
                      callback();
                  });
        });
    });
}
