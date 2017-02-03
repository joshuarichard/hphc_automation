var fs = require('fs');
var nconf  = require('nconf');
var colors = require('colors/safe');
var webdriver = require('selenium-webdriver');
var By = webdriver.By;
var until = webdriver.until;

nconf.file({
    file: 'config.json'
});

var group = 'testorgs';
var PARENTS = nconf.get(group);
var NUM_OF_PARENTS = PARENTS.length;

// create all organizations
console.log(colors.black('INFO: ') + 'Starting up...');

getAndStoreUIds(function() {
    console.log(colors.magenta('INFO: ') + 'Assigning permissions for all organizations.');
    var uids = nconf.get(group + '_uids');
    var orgs = [];
    for (var key in uids) {
        if (uids.hasOwnProperty(key)) {
            orgs.push(key);
        }
    }

    var perm1 = {
        "adminType": "Organization Administrator"
    }

    var perm2 = {
        "adminType": "Datamart Administrator"
    }

    var num_of_perms_set = 0;
    orgs.forEach(function(org, index) {
        setPermissions(org, uids[org], perm1, function() {
            setPermissions(org, uids[org], perm2, function() {
                if (num_of_perms_set === orgs.length) {
                    console.log(colors.green('INFO: ') + 'Done setting permissions.');
                }
            });
        });
    });
});

/*
console.log(colors.magenta('INFO: ') + 'Beginning organization creation...');
var parents_created = 0;
PARENTS.forEach(function(parent, index) {
    // createParent() uses createChild()
    createParent(parent.name, parent.acronym, parent.children, function() {
        parents_created++;
        if (parents_created == PARENTS.length) {
            console.log(colors.magenta('INFO: ') + 'Organization creation completed.');
            // get the uids for every org just created and store in nconf
            getAndStoreUIds(function() {
                console.log(colors.magenta('INFO: ') + 'Assigning security groups to all organizations.');
                var uids = nconf.get(group + '_uids');
                var orgs = [];
                for (var key in uids) {
                    if (uids.hasOwnProperty(key)) {
                        orgs.push(key);
                    }
                }

                // then assign their security groups
                var num_of_sgs_assigned = 0;
                orgs.forEach(function(org, index) {
                    assignSecurityGroup(org, uids[org], "DataMart Administrator", function() {
                        assignSecurityGroup(org, uids[org], "Organization Administrator", function() {
                            num_of_sgs_assigned++;
                            if (num_of_sgs_assigned === orgs.length) {
                                console.log(colors.magenta('INFO: ') + 'Security groups assigned.');
                                // NEXT THING GOES HERE ...................................
                                console.log(colors.magenta('INFO: ') + 'Complete.');
                            }
                        });
                    });
                });
            });
        }
    });
});
*/

function createParent(pName, pAcronym, children, callback) {
    console.log(colors.blue('INFO: ') + 'Creating parent (' + pName + ', ' + pAcronym + ').');

    // init webdriver
    var driver = new webdriver.Builder().forBrowser('firefox').build();

    // sign in
    driver.get('https://edgednsquerytool.lincolnpeak.com/organizations/details');
    driver.findElement(By.id('txtUserName')).sendKeys(nconf.get('credentials:username'));
    driver.findElement(By.id('txtPassword')).sendKeys(nconf.get('credentials:password'));
    driver.findElement(By.className('btn-primary')).click();

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
}

function createChild(cName, pName, pAcronym, callback) {
    var cAcronym = pAcronym + cName.split('-')[1];
    console.log(colors.cyan('INFO: ') + 'Creating child (' + cName + ', ' + cAcronym + ') with parent (' + pName + ', ' + pAcronym + ').');

    // init webdriver
    var driver = new webdriver.Builder().forBrowser('firefox').build();

    // sign in
    driver.get('https://edgednsquerytool.lincolnpeak.com/organizations/details');
    driver.findElement(By.id('txtUserName')).sendKeys(nconf.get('credentials:username'));
    driver.findElement(By.id('txtPassword')).sendKeys(nconf.get('credentials:password'));
    driver.findElement(By.className('btn-primary')).click();

    // fill in form
    driver.wait(function() {
        return driver.findElement(By.id('txtName')).isDisplayed();
    }, 5000).then(function() {
              driver.findElement(By.id('txtName')).sendKeys(cName);
              driver.findElement(By.id('txtAcronym')).sendKeys(cAcronym);
              //driver.executeScript("arguments[0].setAttribute('id', 'cboOrg_option_selected')", driver.findElement(By.xpath("//*[@id='cboOrg_listbox']//*[contains(text(), '" + pName + "')]")));
              driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//li[@role='option' and text()='" + pName + "']")));
              driver.findElement(By.id('btnSave')).click();
              driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 5000)
                    .then(function() {
                        console.log(colors.green('INFO: ') + 'Child created (' + cName + ', ' + cAcronym + ') with parent (' + pName + ', ' + pAcronym + ').');
                        driver.quit();
                        callback();
                    });
        });
}

function assignSecurityGroup(oName, uid, adminType, callback) {
    console.log(colors.yellow('INFO: ') + 'Assigning security group (' + oName + ') the type ' + adminType + '.');
    // init webdriver
    var driver = new webdriver.Builder().forBrowser('firefox').build();

    // sign in
    driver.get('https://edgednsquerytool.lincolnpeak.com/securitygroups/details?OwnerID=' + uid);
    driver.findElement(By.id('txtUserName')).sendKeys(nconf.get('credentials:username'));
    driver.findElement(By.id('txtPassword')).sendKeys(nconf.get('credentials:password'));
    driver.findElement(By.className('btn-primary')).click();

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

        //driver.findElement(By.xpath("//span[contains(text(), 'None')]")).click();
        //driver.executeScript("arguments[0].setAttribute('id', 'cboKind_option_selected')", driver.findElement(By.xpath("//*[@id='cboKind_listbox']//*[text() = 'DataMart Administrators']")));
        //driver.executeScript("arguments[0].setAttribute('aria-selected', 'true')", driver.findElement(By.xpath("//*[@id='cboKind_listbox']//*[text() = 'DataMart Administrators']")));
    });
}

// TODO
/* perm = {
       "adminType": "Organization Administrator",
       "permissions": [
           "...?"
       ]
   }
*/
function setPermissions(oName, uid, perm, callback) {
    console.log(colors.yellow('INFO: ') + 'Setting permissions for ' + oName + ' and type ' + perm.adminType);

    // init webdriver
    var driver = new webdriver.Builder().forBrowser('firefox').build();

    // sign in
    driver.get('https://edgednsquerytool.lincolnpeak.com/organizations/details?OwnerID=' + uid);
    driver.findElement(By.id('txtUserName')).sendKeys(nconf.get('credentials:username'));
    driver.findElement(By.id('txtPassword')).sendKeys(nconf.get('credentials:password'));
    driver.findElement(By.className('btn-primary')).click();

    // wait for the organization page to load
    driver.wait(until.elementLocated(By.xpath("//div[@id='tabs']//a[@class='k-link' and text()='Organization Permissions']")), 5000)
          .then(function() {
              // once it's loaded click the add security group button
              driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnAddSecurityGroup')));

              // and wait for the popup
              driver.wait(function() {
                  return driver.findElement(By.xpath("//iframe[@src='/security/SecurityGroupWindow']")).isDisplayed();
              }, 5000).then(function() {
                  // once the security group window popup has loaded switch the frame
                  //driver.switchTo().frame(By.xpath("//iframe[@src='/security/SecurityGroupWindow']"));
                  driver.switchTo().defaultContent();
                  driver.switchTo().frame(0);
                  //driver.switchTo().frame(By.xpath("//iframe[@src='/security/SecurityGroupWindow']"));
                  console.log('going to start waiting for the org name');

                  // once we've switched then wait for the oName to pop up in the left hand tbody
                  driver.wait(function(){
                      return driver.findElement(By.xpath("//td[@role='gridcell' and text()='" + oName + "']")).isDisplayed();
                  }, 5000)                            //until.elementLocated(By.xpath("//td[@role='gridcell' and text()='" + oName + "']")), 5000)
                        .then(function() {
                            // when it's loaded click the button
                            console.log('found the org name now look for it and click it.');
                            driver.findElement(By.xpath("//td[@role='gridcell' and text()='" + oName + "']")).click();
                            //driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//td[@role='gridcell' and text()='" + oName + "']")));

                            // and wait for the right side to load
                            driver.wait(until.elementLocated(By.xpath("//*[@id='gOrgSecResults']//tbody//tr[@class='k-alt']")), 5000)
                                  .then(function() {
                                      // once the right tbody is loaded click the appropriate administrator tr
                                      console.log('found the boxes')
                                      driver.findElements(By.xpath("//*[@id='gOrgSecResults']//tbody[@role='rowgroup']//tr"))
                                            .then(function(els) {
                                                if (perm.adminType === "DataMart Administrator") {
                                                    console.log('clicking on datamart admin');
                                                    driver.executeScript("arguments[0].click();", els[0]);
                                                } else {
                                                    console.log('clicking on org admin');
                                                    driver.executeScript("arguments[0].click();", els[1]);
                                                    //els[1].click();
                                                }

                                                // and switch back to the top
                                                //driver.switchTo().defaultContent();
                                                console.log('now start waiting.........');

                                                // wait for the first allow button to load
                                                driver.wait(function() {
                                                    console.log('waiting for button to click to allow up and ready');
                                                    return driver.findElement(By.xpath("//span[text()='Edit DataMart']//..//..//input[@value='allow']")).isDisplayed();
                                                }, 5000).then(function() {
                                                    // then click the allow permissions
                                                    console.log('it\'s ready now scan through permissions and and assign the right ones.');
                                                    perm.permissions.forEach(function(p, index) {
                                                        driver.findElement(By.xpath("//span[text()='" + p + "']//..//..//input[@value='allow']")).click();
                                                    });

                                                    console.log('now click save...');
                                                    // finally click save
                                                    driver.findElement(By.id('btnSave')).click();
                                                    driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnSave')));

                                                    // and wait for the page to confirm successful save
                                                    driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 5000)
                                                          .then(function() {
                                                              // we're done so log, driver.quit(), and callback
                                                              console.log(colors.green('INFO: ') + 'Permission set (' + oName + ') with permission ' + perm.adminType + '.');
                                                              driver.quit();
                                                              callback();
                                                          });
                                                    });
                                            });
                                  });
                        }); // "//*[text()='" + oName + "\\" + perm1.adminType + "']"
              });
          });
}

function getAndStoreUIds(callback) {
    console.log(colors.grey('INFO: ') + 'Getting UIDs for all orgs...');
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

    // init webdriver
    var driver = new webdriver.Builder().forBrowser('firefox').build();

    // sign in
    driver.get('https://edgednsquerytool.lincolnpeak.com/organizations');
    driver.findElement(By.id('txtUserName')).sendKeys(nconf.get('credentials:username'));
    driver.findElement(By.id('txtPassword')).sendKeys(nconf.get('credentials:password'));
    driver.findElement(By.className('btn-primary')).click();

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
                    nconf.set(group + '_uids', orglist);
                    driver.quit();
                    console.log(colors.green('INFO: ') + 'Got all UIDs.');
                    callback();
                }
            });
        });
    });
}

/*
ff
*/
