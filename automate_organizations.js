var fs = require('fs');
var nconf  = require('nconf');
var colors = require('colors/safe');
var webdriver = require('selenium-webdriver');
var sleep = require('sleep-promise');
var By = webdriver.By;
var until = webdriver.until;

nconf.file({
    file: 'config.json'
});

var POPMEDNET_USERNAME = nconf.get('credentials:username');
var POPMEDNET_PASSWORD = nconf.get('credentials:password');
var POPMEDNET_URLS = nconf.get('popmednet_urls');
var ORG_SET = nconf.get('organizations:org_set');
var ORG_PERMISSIONS = nconf.get('organizations:org_operations:permissions');
var ORG_SECURITY_GROUPS = nconf.get('organizations:org_operations:security_groups');
var PARENTS = nconf.get(ORG_SET);

console.log('INFO: Starting up...');

// CREATE ALL ORGANIZATIONS
console.log(colors.magenta('INFO: ') + 'Beginning organization creation...');
var parents_created = 0;
PARENTS.forEach(function(parent, index) {
    // createParent() uses createChild()
    createParent(parent.name, parent.acronym, parent.children, function() {
        parents_created++;
        if (parents_created == PARENTS.length) {
            console.log(colors.green('INFO: ') + 'Organization creation completed.');
            // get the uids for every org just created and store in nconf
            getAndStoreUIds(function() {
                console.log(colors.magenta('INFO: ') + 'Assigning security groups to all organizations...');

                // then assign their security groups
                var num_of_sgs_assigned = 0;
                var orgs = nconf.get('organizations:' + ORG_SET + '_orgs');
                var uids = nconf.get('organizations:' + ORG_SET + '_uids');
                orgs.forEach(function(org, index) {
                    // ASSIGN SECURITY GROUPS
                    ORG_SECURITY_GROUPS.forEach(function(security_group, index) {
                        assignSecurityGroup(org, uids[org], security_group, function() {
                            num_of_sgs_assigned++;
                            if (num_of_sgs_assigned === orgs.length * ORG_SECURITY_GROUPS.length) {
                                console.log(colors.green('INFO: ') + 'Security groups assigned.');
                                console.log(colors.magenta('INFO: ') + 'Assigning permissions for all organizations...');

                                var num_of_perms_set = 0;
                                orgs.forEach(function(org, index) {
                                    // SET ORGANIZATION PERMISSIONS
                                    ORG_PERMISSIONS.forEach(function(permission, index) {
                                        setPermissions(org, uids[org], permission, function() {
                                            num_of_perms_set++;
                                            if (num_of_perms_set === orgs.length * ORG_PERMISSIONS.length) {
                                                console.log(colors.green('INFO: ') + 'Done setting permissions.');
                                                // NEXT THING GOES HERE...
                                                console.log(colors.magenta('INFO: ') + 'Complete.');
                                            }
                                        });
                                    });
                                });
                            }
                        });
                    });
                });
            });
        }
    });
});

function buildDriverAndSignIn(url, callback) {
    // init webdriver
    var driver = new webdriver.Builder().forBrowser(nconf.get("driver")).build();

    // sign in
    driver.get(url);
    driver.findElement(By.id('txtUserName')).sendKeys(POPMEDNET_USERNAME);
    driver.findElement(By.id('txtPassword')).sendKeys(POPMEDNET_PASSWORD);
    driver.findElement(By.className('btn-primary'))
          .click()
          .then(function() {
              callback(driver);
          });
  }

function createParent(pName, pAcronym, children, callback) {
    console.log(colors.blue('INFO: ') + 'Creating parent (' + pName + ', ' + pAcronym + ').');

    buildDriverAndSignIn(POPMEDNET_URLS.org_creation_url, function(driver) {
        // fill in form
        driver.wait(function() {
            return driver.findElement(By.id('txtName')).isDisplayed();
        }, 5000).then(function() {
                  driver.findElement(By.id('txtName')).sendKeys(pName);
                  driver.findElement(By.id('txtAcronym')).sendKeys(pAcronym);
                  driver.findElement(By.id('btnSave')).click();
                  driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 5000)
                        .then(function() {
                            console.log(colors.green('INFO: ') + 'Parent created (' + pName + ', ' + pAcronym + ').');
                            driver.quit();

                            var children_created = 0;
                            children.forEach(function(child, index) {
                                createChild(child, pName, pAcronym, function() {
                                    children_created++;
                                    if (children_created == children.length) {
                                        callback();
                                    }
                                });
                            });
                        });
            });
    });
}

function createChild(cName, pName, pAcronym, callback) {
    var cAcronym = pAcronym + cName.split('-')[1];
    console.log(colors.cyan('INFO: ') + 'Creating child (' + cName + ', ' + cAcronym + ') with parent (' + pName + ', ' + pAcronym + ').');

    buildDriverAndSignIn(POPMEDNET_URLS.org_creation_url, function(driver) {
        // fill in form
        driver.wait(function() { return driver.findElement(By.id('txtName')).isDisplayed(); }, 5000)
              .then(function() {
                  driver.findElement(By.id('txtName')).sendKeys(cName);
                  driver.findElement(By.id('txtAcronym')).sendKeys(cAcronym);
                  driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//li[@role='option' and text()='" + pName + "']")));
                  driver.findElement(By.id('btnSave')).click();
                  driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 5000)
                        .then(function() {
                            console.log(colors.green('INFO: ') + 'Child created (' + cName + ', ' + cAcronym + ') with parent (' + pName + ', ' + pAcronym + ').');
                            driver.quit();
                            callback();
                        });
            });
    });
}

function assignSecurityGroup(oName, uid, adminType, callback) {
    console.log(colors.yellow('INFO: ') + 'Assigning security group (' + oName + ') the type ' + adminType + '.');

    buildDriverAndSignIn(POPMEDNET_URLS.org_security_groups_creation_url + uid, function(driver) {
        driver.wait(function() {
            return driver.findElement(By.id('txtName')).isDisplayed();
        }, 5000).then(function() {
            driver.findElement(By.id('txtName')).clear();
            driver.findElement(By.id('txtName')).sendKeys(adminType);
            driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//li[@role='option' and text()='DataMart Administrators']")));
            driver.findElement(By.id('btnSave')).click();
            driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 5000)
                  .then(function() {
                      console.log(colors.green('INFO: ') + 'Security group assigned (' + oName + ') assigned ' + adminType + '.');
                      driver.quit();
                      callback();
                  });
        });
    });
}

function setPermissions(oName, uid, perm, callback) {
    console.log(colors.yellow('INFO: ') + 'Setting permissions for ' + oName + ' and type ' + perm.admin_type);

    buildDriverAndSignIn(POPMEDNET_URLS.org_profile_url + uid, function(driver) {
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
                                                      .then(function(els) {
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
                                                                              driver.wait(function() { return driver.findElement(By.xpath("//span[text()='Edit DataMart']//..//..//input[@value='allow']")).isDisplayed(); }, 5000).then(function() {
                                                                                  // then click the allow permissions radio buttons
                                                                                  var num_of_perms_clicked = 0;
                                                                                  perm.permissions.forEach(function(p, index) {
                                                                                      driver.findElement(By.xpath("//span[text()='" + p + "']//..//..//input[@value='allow']")).click().then(function() {
                                                                                          num_of_perms_clicked++;
                                                                                          // once we've clicked all of them
                                                                                          if (num_of_perms_clicked === perm.permissions.length) {
                                                                                              // then finally click save
                                                                                              driver.findElement(By.id('btnSave')).click();

                                                                                              // and wait for the page to confirm successful save
                                                                                              driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 10000)
                                                                                                    .then(function() {
                                                                                                        // we're done so log, driver.quit(), and callback
                                                                                                        console.log(colors.green('INFO: ') + 'Permission set (' + oName + ') with permission ' + perm.admin_type + '.');
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

function getAndStoreUIds(callback) {
    console.log(colors.magenta('INFO: ') + 'Getting UIDs for all orgs...');
    var orglist = {};
    var total_num_of_orgs = 0;
    for (var a = 0; a < PARENTS.length; a++) {
        orglist[PARENTS[a].name] = null;
        total_num_of_orgs++;
        for (var b = 0; b < PARENTS[a].children.length; b++) {
            total_num_of_orgs++;
            orglist[PARENTS[a].children[b]] = null;
        }
    }

    buildDriverAndSignIn(POPMEDNET_URLS.org_list_url, function(driver) {
        driver.wait(until.elementLocated(By.linkText(PARENTS[0].name)), 5000).then(function() {
            var num_of_uids_found = 0;
            var orgs = [];
            for (var key in orglist) {
                if (orglist.hasOwnProperty(key)) {
                    orgs.push(key);
                }
            }

            orgs.forEach(function(org, index) {
                driver.wait(function() {
                    return driver.findElement(By.xpath("//a[text() = '" + org + "']")).getAttribute('href');
                }).then(function(href) {
                    num_of_uids_found++;
                    orglist[org] = href.split("=")[1];
                    if (num_of_uids_found === total_num_of_orgs) {
                        nconf.set('organizations:' + ORG_SET + '_uids', orglist);
                        nconf.set('organizations:' + ORG_SET + '_orgs', orgs);
                        driver.quit();
                        console.log(colors.green('INFO: ') + 'Got all UIDs.');
                        callback();
                    }
                });
            });
        });
    });
}
