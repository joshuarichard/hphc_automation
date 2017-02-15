/**
 * set_org_permissions.js
 *
 * Module that sets permissions for each organization.
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
var SERVER_NAME = nconf.get('server');

var exports = module.exports = {};

/**
 * Sets permissions for each organization. (steps 13-20 in the wiki)
 * @param {String} oName - The organization to set permissions for.
 * @param {String} uid - The uid for this organization. Used to build the organization's profile url.
 * @param {Object} perm - JSON Object storing the admin_type and permissions to set for this organization.
 * @callback {setPermissionsCallback} callback - The callback that resolves this function.
 */
exports.setPermissions = function(oName, uid, perm, callback) {
    console.log(colors.yellow('INFO:') + ' Setting permissions for ' + oName + ' and type ' + perm.admin_type);

    // build driver
    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.org_profile_url + uid, function(driver) {
        // build the xpath for the Organization Permissions tab based on which server we're using
        var org_perm_xpath = "";
        if (SERVER_NAME === "edge") {
            org_perm_xpath = "//div[@id='tabs']//a[@class='k-link' and text()='Organization Permissions']";
        } else if (SERVER_NAME === "pmnuat") {
            org_perm_xpath = "//div[@id='tabs']//span[@class='k-link' and text()='Organization Permissions']";
        }

        // wait for the organization profile page to load using the previously built org_perm_xpath
        driver.wait(until.elementLocated(By.xpath(org_perm_xpath)), 5000)
              .then(function() {
                  // once it's loaded click the add security button
                  // use js executor because it's "hidden under the organization permissions tab"
                  driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnAddSecurityGroup')));

                  // and wait for the security SecurityGroupWindow popup
                  driver.wait(function() { return driver.findElement(By.xpath("//iframe[@src='/security/SecurityGroupWindow']")).isDisplayed(); }, 5000)
                        .then(sleep(2000)) // add 2 second wait time for chrome
                        .then(function() {
                            // once the security ORG_SET window popup has loaded switch the frame
                            // (have to switch to top first to ensure the correct frame is switched to)
                            driver.switchTo().defaultContent();
                            driver.switchTo().frame(0);

                            // once we've switched then wait for the oName to pop up in the left hand tbody
                            driver.wait(function(){ return driver.findElement(By.xpath("//td[@role='gridcell' and text()='" + oName + "']")).isDisplayed(); }, 5000)
                                  .then(function() {
                                      // when the left tbody is loaded then click the appropriate oName button
                                      driver.findElement(By.xpath("//td[@role='gridcell' and text()='" + oName + "']")).click();

                                      // and wait for the right side to load
                                      driver.wait(until.elementLocated(By.xpath("//*[@id='gOrgSecResults']//tbody//tr[@class='k-alt']")), 5000)
                                            .then(function() {
                                                // once the right tbody is loaded...
                                                driver.findElements(By.xpath("//*[@id='gOrgSecResults']//tbody[@role='rowgroup']//tr"))
                                                      .then(function() {
                                                          // ...find the two tr's...
                                                          driver.findElements(By.xpath("//*[@id='gOrgSecResults']//tbody//tr"))
                                                                .then(function(els) {
                                                                    // ...and click the appropriate administrator tr
                                                                    if (perm.admin_type === "DataMart Administrator") {
                                                                        els[0].click();
                                                                    } else {
                                                                        els[1].click();
                                                                    }

                                                                    // and switch back to the top
                                                                    driver.switchTo().defaultContent();

                                                                    // wait until we're back at the top
                                                                    driver.wait(until.elementLocated(By.xpath(org_perm_xpath)), 5000)
                                                                          .then(function() {
                                                                              // and click on the organization permissions tab just in case - using js executor
                                                                              driver.executeScript("arguments[0].click();", driver.findElement(By.xpath(org_perm_xpath)));
                                                                              driver.wait(function() { return driver.findElement(By.xpath("//span[text()='Edit DataMart']//..//..//input[@value='allow']")).isDisplayed(); }, 5000)
                                                                                    .then(sleep(2000)) // sleep 2 seconds again for chrome
                                                                                    .then(function() {
                                                                                        // then click the allow permissions radio buttons
                                                                                        var num_of_perms_clicked = 0;
                                                                                        perm.permissions.forEach(function(p, index) {
                                                                                            driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//span[text()='" + p + "']//..//..//input[@value='allow']")));
                                                                                            driver.wait(sleep(2000)).then(function() {
                                                                                                num_of_perms_clicked++;

                                                                                                // once we've clicked all of them
                                                                                                if (num_of_perms_clicked === perm.permissions.length) {
                                                                                                    // then finally click save
                                                                                                    driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnSave')));

                                                                                                    // and wait for the page to confirm successful save
                                                                                                    driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 10000)
                                                                                                          .then(function() {
                                                                                                              // we're done so log, driver.quit(), and callback
                                                                                                              console.log(colors.green('INFO:') + ' Permission set (' + oName + ') with permission ' + perm.admin_type + '.');
                                                                                                              driver.quit();
                                                                                                              callback();
                                                                                                          });
                                                                                                }
                                                                                            });
                                                                                        });
                                                                              });
                                                                          });
                                                                });
                                                      });
                                            });
                                  });
                  });
              });
    });
}
