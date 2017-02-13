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

exports.setPermissions = function(oName, uid, perm, callback) {
    console.log('INFO: Setting permissions for ' + oName + ' and type ' + perm.admin_type);

    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.org_profile_url + uid, function(driver) {
        // wait for the organization profile page to load
        driver.wait(until.elementLocated(By.xpath("//div[@id='tabs']//a[@class='k-link' and text()='Organization Permissions']")), 5000)
              .then(function() {
                  // once it's loaded click the add security ORG_SET button
                  // use js executor because it's "hidden under the organization permissions tab"
                  driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnAddSecurityGroup')));

                  // and wait for the security ORG_SET window popup (add 2 seconds wait time for chrome)
                  driver.wait(function() { return driver.findElement(By.xpath("//iframe[@src='/security/SecurityGroupWindow']")).isDisplayed(); }, 5000)
                        .then(sleep(2000))
                        .then(function() {
                            // once the security ORG_SET window popup has loaded switch the frame
                            driver.switchTo().defaultContent(); // have to switch to top first to ensure correct frame
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
                                                                    driver.wait(until.elementLocated(By.xpath("//div[@id='tabs']//a[@class='k-link' and text()='Organization Permissions']")), 5000)
                                                                          .then(function() {
                                                                              // and click on the organization permissions tab just in case using js executor
                                                                              driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//div[@id='tabs']//a[@class='k-link' and text()='Organization Permissions']")));
                                                                              driver.wait(function() { return driver.findElement(By.xpath("//span[text()='Edit DataMart']//..//..//input[@value='allow']")).isDisplayed(); }, 5000)
                                                                                    .then(sleep(2000))
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
                                                                                                            console.log('INFO: Permission set (' + oName + ') with permission ' + perm.admin_type + '.');
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
