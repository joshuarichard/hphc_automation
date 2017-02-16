/**
 * create_users.js
 *
 * Module that manages user creation.
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
 * Creates a user.
 * @param {String} oName - The name for the organization this user will be associated with.
 * @param {String} uFirstName - The first name for this user. Naming Convention is that it's oAcronym
 * @param {String} uLastName - Last name for this user. Naming convention is that it's the type (DMAdmin or OrgAdmin)
 * @param {String} uEmail - Email for this user. Will always be "support@popmednet.org"
 * @param {String} uUsername - Username for this user. Should be uFirstname and uLastName concatenated.
 * @param {String} uPassword - Password for this user. Will always be "Welcome123!"
 * @param {Array.String} usersAlreadyAdded - Array of users that have already been added to this server. Used for restarting.
 * @callback {createUserCallback} callback - The callback that resolves this function.
 */
exports.createUser = function(oName, uFirstName, uLastName, uEmail, uUsername, uPassword, callback) {
    console.log(colors.yellow('INFO:') + ' Creating user ' + uUsername + '.');
    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.user_creation_url, function(driver) {
        // wait for page to load...
        driver.wait(function() { return driver.findElement(By.id('btnSave')).isDisplayed(); }, 20000)
              .then(sleep(1500), 3000)
              .then(function() {
                  // ... then fill in form
                  driver.findElement(By.id('txtFirstName')).sendKeys(uFirstName);
                  driver.findElement(By.id('txtLastName')).sendKeys(uLastName);
                  driver.findElement(By.id('txtEmail')).sendKeys(uEmail);
                  driver.findElement(By.id('txtUserName')).sendKeys(uUsername);

                  // click on the organization in the dropdown on the left
                  driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//li[@role='option' and text()='" + oName + "']")));

                  // then here comes the ridiculous workaround...

                  // click the save button
                  driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnSave')))
                        .then(sleep(2500))
                        .then(function() {
                          // but it's going to say field name invalid so click OK
                          driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnOK')))
                                .then(sleep(2500))
                                .then(function() {
                                  // then click save again
                                  driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnSave')))
                                        .then(sleep(2500))
                                        .then(function() {
                                          // and this time it works so great let's keep moving
                                          driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnOK')))
                                                .then(sleep(2500))
                                                .then(function() {
                                                    // then click to change the password
                                                    driver.findElements(By.id('btnOK')).then(function(els) {
                                                        driver.executeScript("arguments[0].click();", els[1]);

                                                        // click the change password button
                                                        driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnChangePassword')));
                                                        driver.wait(sleep(2000), 3000)
                                                              .then(function whenPasswordWindowReady() {
                                                                  // first switch to top then switch to new frame (set password frame)
                                                                  driver.switchTo().defaultContent();
                                                                  driver.switchTo().frame(0);

                                                                  // and type in the password
                                                                  driver.findElement(By.id('txtPassword')).sendKeys(uPassword);
                                                                  driver.findElement(By.id('txtConfirmPassword')).sendKeys(uPassword);

                                                                  // then save
                                                                  driver.findElement(By.id('btnSave')).click();

                                                                  // switch back to the top
                                                                  driver.switchTo().defaultContent();

                                                                  // wait for the password to save
                                                                  driver.wait(until.elementLocated(By.id('btnSave')), 10000)
                                                                        .then(function whenPasswordHasBeenSet() {
                                                                            // build the xpath for the security groups tab based on which server we're using
                                                                            var security_group_tab_xpath = "";
                                                                            if (SERVER_NAME === "edge") {
                                                                                security_group_tab_xpath = "//div[@id='tabs']//a[@class='k-link' and text()='Security Groups']";
                                                                            } else if (SERVER_NAME === "pmnuat") {
                                                                                security_group_tab_xpath = "//div[@id='tabs']//span[@class='k-link' and text()='Security Groups']";
                                                                            }

                                                                            var security_groups = [];
                                                                            if (uLastName === "DMAdmin") {
                                                                                security_groups.push("Operations Center/Everyone");
                                                                                security_groups.push(oName + "/DataMartAdministrator");
                                                                                security_groups.push("200 DM Project/DataMartAdministrator");
                                                                            } else if (uLastName === "OrgAdmin") {
                                                                                security_groups.push("Operations Center/Everyone");
                                                                                security_groups.push(oName + "/OrganizationAdministrator");
                                                                            }

                                                                            var sgs_assigned = 0;
                                                                            security_groups.forEach(function(sg, index) {
                                                                                // wait for the user profile page to load using the previously built security_group_tab_xpath
                                                                                driver.wait(until.elementLocated(By.xpath(security_group_tab_xpath)), 20000)
                                                                                      .then(function whenThePageHasLoaded() {
                                                                                          // once it's loaded click the add security button
                                                                                          // use js executor because it's "hidden under the organization permissions tab"
                                                                                          driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnAddSecurityGroup')))
                                                                                                .then(sleep(1000))
                                                                                                .then(function() {
                                                                                                  // and wait for the security SecurityGroupWindow popup. - add 2 second wait time for chrome
                                                                                                  driver.wait(function forTheSecurityGroupWindow() { return driver.findElement(By.xpath("//iframe[@src='/security/SecurityGroupWindow']")).isDisplayed(); }, 20000)
                                                                                                        .then(sleep(2000))
                                                                                                        .then(function addTheSecurityGroup() {
                                                                                                            // switch to the SecurityGroupWindow
                                                                                                            driver.switchTo().defaultContent();
                                                                                                            driver.switchTo().frame(0);

                                                                                                            // check if we're adding the 200 DM Project security group, if so we have to switch to the Projects tab
                                                                                                            if (sg.split('/')[0] === "200 DM Project") {
                                                                                                                driver.findElement(By.xpath("//*[@id='tabs']//a[text()='Projects']")).click();
                                                                                                            }

                                                                                                            // and wait for the left hand tbody
                                                                                                            driver.wait(until.elementLocated(By.xpath("//td[@role='gridcell' and text()='" + sg.split('/')[0] + "']")), 20000)
                                                                                                                  .then(function() {
                                                                                                                      // when the left tbody is loaded then click the appropriate oName button
                                                                                                                      driver.findElement(By.xpath("//td[@role='gridcell' and text()='" + sg.split('/')[0] + "']")).click();

                                                                                                                      var right_tbody_xpath = "";
                                                                                                                      if (sg.split('/')[0] === "200 DM Project") {
                                                                                                                          right_tbody_xpath = "//*[@id='gProjSecResults']//tbody//tr[@class='k-alt']";
                                                                                                                      } else {
                                                                                                                          right_tbody_xpath = "//*[@id='gOrgSecResults']//tbody//tr[@class='k-alt']";
                                                                                                                      }

                                                                                                                      // and wait for the right side to load
                                                                                                                      driver.wait(until.elementLocated(By.xpath(right_tbody_xpath)), 5000)
                                                                                                                            .then(function() {
                                                                                                                                          // ...find the two tr's...
                                                                                                                                          driver.findElements(By.xpath("//*[@id='gOrgSecResults']//tbody//tr"))
                                                                                                                                                .then(function(els) {
                                                                                                                                                    // ...and click the appropriate administrator tr
                                                                                                                                                    if (sg === "Operations Center/Everyone") {
                                                                                                                                                        if (SERVER_NAME === "edge") {
                                                                                                                                                            els[0].click();
                                                                                                                                                        } else if (SERVER_NAME === "pmnuat"){
                                                                                                                                                            els[1].click();
                                                                                                                                                        }

                                                                                                                                                        // and switch back to the top
                                                                                                                                                        driver.switchTo().defaultContent();

                                                                                                                                                        sgs_assigned++;
                                                                                                                                                        if (sgs_assigned === security_groups.length) {
                                                                                                                                                            driver.wait(sleep(2000), 3000)
                                                                                                                                                                  .then(function() {
                                                                                                                                                                      finishUp(driver, uUsername, oName, function() {
                                                                                                                                                                          callback();
                                                                                                                                                                      });
                                                                                                                                                                });
                                                                                                                                                        }
                                                                                                                                                    } else if (sg === oName + "/DataMartAdministrator") {
                                                                                                                                                        els[0].click();
                                                                                                                                                        // and switch back to the top
                                                                                                                                                        driver.switchTo().defaultContent();

                                                                                                                                                        sgs_assigned++;
                                                                                                                                                        if (sgs_assigned === security_groups.length) {
                                                                                                                                                            driver.wait(sleep(2000), 3000)
                                                                                                                                                                  .then(function() {
                                                                                                                                                                      finishUp(driver, uUsername, oName, function() {
                                                                                                                                                                          callback();
                                                                                                                                                                      });
                                                                                                                                                                });
                                                                                                                                                        }
                                                                                                                                                    } else if (sg === oName + "/OrganizationAdministrator") {
                                                                                                                                                        els[1].click();
                                                                                                                                                        // and switch back to the top
                                                                                                                                                        driver.switchTo().defaultContent();

                                                                                                                                                        sgs_assigned++;
                                                                                                                                                        if (sgs_assigned === security_groups.length) {
                                                                                                                                                            driver.wait(sleep(2000), 3000)
                                                                                                                                                                  .then(function() {
                                                                                                                                                                      finishUp(driver, uUsername, oName, function() {
                                                                                                                                                                          callback();
                                                                                                                                                                      });
                                                                                                                                                                  });
                                                                                                                                                        }
                                                                                                                                                    } else if (sg === "200 DM Project/DataMartAdministrator") {
                                                                                                                                                        driver.wait(function() { return driver.findElement(By.xpath("//td[@role='gridcell' and text()='200 DM Project']")).isDisplayed(); }, 20000)
                                                                                                                                                              .then(function() {
                                                                                                                                                                  driver.findElement(By.xpath("//td[@role='gridcell' and text()='200 DM Project']")).click();
                                                                                                                                                                  driver.wait(until.elementLocated(By.xpath("//*[@id='gProjSecResults']//tbody[@role='rowgroup']//tr")), 20000)
                                                                                                                                                                        .then(sleep(2000), 3000)
                                                                                                                                                                        .then(function() {
                                                                                                                                                                            // once the right tbody is loaded...
                                                                                                                                                                            driver.findElements(By.xpath("//*[@id='gProjSecResults']//tbody[@role='rowgroup']//tr"))
                                                                                                                                                                                  .then(function(project_els) {
                                                                                                                                                                                      if (SERVER_NAME === "edge") {
                                                                                                                                                                                          project_els[1].click();
                                                                                                                                                                                      } else if (SERVER_NAME === "pmnuat") {
                                                                                                                                                                                          project_els[0].click();
                                                                                                                                                                                      }

                                                                                                                                                                                      // and switch back to the top
                                                                                                                                                                                      driver.switchTo().defaultContent();

                                                                                                                                                                                      sgs_assigned++;
                                                                                                                                                                                      if (sgs_assigned === security_groups.length) {
                                                                                                                                                                                          driver.wait(sleep(2000), 3000)
                                                                                                                                                                                                .then(function() {
                                                                                                                                                                                                    finishUp(driver, uUsername, oName, function() {
                                                                                                                                                                                                        callback();
                                                                                                                                                                                                    });
                                                                                                                                                                                                });
                                                                                                                                                                                      }
                                                                                                                                                                                  });
                                                                                                                                                                        });
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
                                        });
                                });
                        });
              });
    });
}

function finishUp(driver, uUsername, oName, callback) {
    driver.findElement(By.xpath("//a[text()='Activate']")).click();
    driver.wait(until.elementLocated(By.xpath("//span[text()='Active']")), 20000)
          .then(function() {
              // then finally click save
              driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnSave')));

              // and wait for the page to confirm successful save
              driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 20000)
                    .then(function() {
                        console.log(colors.green('INFO:') + ' Created user ' + uUsername + ' for organization ' + oName + '.');
                        driver.quit();
                        callback();
                    });
          });
}
