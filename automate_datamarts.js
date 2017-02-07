/*
Creating DataMarts
    Networks > datamart > Add datamart button at bottom of screen
    Write in a Name, acronym, and organization. The name should be the same as the name of the organization you're assigning to, only with "QE DataMart" added to the end
    In the Adapter supported field, select PCORNET CDM
    Click save
    Repeat steps 1-2 and assign the DataMart to the same organization. add "Legacy DataMart" to the end of the DataMart name instead of "QE DataMart.
    In the Installed Models tab, click Install Model button
    Select File Distribution. The page should save automatically
    Repeat steps 1-7 for every organization. You should end up with every organization having 2 DataMarts, 1 QE DataMart and 1 Legacy DataMart. 200 total DataMarts
*/

var fs = require('fs');
var nconf  = require('nconf');
var webdriver = require('selenium-webdriver');
var sleep = require('sleep-promise');
var bunyan = require('bunyan');
var By = webdriver.By;
var until = webdriver.until;

var log = bunyan.createLogger({
    name: 'auto_orgs',
    streams: [
        {
            level: 'info',
            stream: process.stdout //,
            // path: './log/app_info.log',
            // period: '1d',  // daily rotation
            // count: 3
        }
    ]
});

nconf.file({
    file: 'config.json'
});

var POPMEDNET_USERNAME = nconf.get('credentials:username');
var POPMEDNET_PASSWORD = nconf.get('credentials:password');
var POPMEDNET_URLS = nconf.get('popmednet_urls');
var ORG_SET = nconf.get('organizations:org_set');
var DM_SET = nconf.get('datamarts:dm_set');
var DM_TYPES = nconf.get('datamarts:dm_types');
var PARENTS = nconf.get('organizations:' + ORG_SET);

var org_acro_dict = [];
for (var a = 0; a < PARENTS.length; a++) {
    var parent = {};
    parent[PARENTS[a].name  ] = PARENTS[a].acronym;
    org_acro_dict.push(parent);
    for (var b = 0; b < PARENTS[a].children.length; b++) {
        var child = {};
        child[PARENTS[a].children[b]] = PARENTS[a].acronym + PARENTS[a].children[b].split('-')[1];
        org_acro_dict.push(child);  // what the fuck
    }
}

nconf.set('organizations:' + ORG_SET + '_orgs', org_acro_dict);

console.log('Starting up...');

// CREATE ALL ORGANIZATIONS
console.log('Beginning datamart creation...');

var num_of_dms_created = 0;
org_acro_dict.forEach(function(org, index) {
    for (var key in org) {
        DM_TYPES.forEach(function(type, index) {
            createDataMart(key, org[key], type, function() {
                if (num_of_dms_created === org_acro_dict.length * DM_TYPES.length) {
                    console.log('Datamart creation complete.');
                    // NEXT THING GOES HERE
                }
            });
        });
    }
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

function createDataMart(oName, oAcronym, type, callback) {
    console.log('Creating datamart (' + oName + " " + type + ', ' + oAcronym + ').');

    if (type === "QE DataMart") {
        oAcronym = oAcronym + "QE";
    } else if (type === "Legacy DataMart") {
        oAcronym = oAcronym + "LG"
    }

    buildDriverAndSignIn(POPMEDNET_URLS.dm_creation_url, function(driver) {
        driver.wait(function() { return driver.findElement(By.id('btnSave')).isDisplayed(); }, 5000)
              .then(function() {
                  driver.findElement(By.id('txtName')).sendKeys(oName + " " + type);
                  driver.findElement(By.id('txtAcronym')).sendKeys(oAcronym);
                  driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//li[@role='option' and text()='" + oName + "']")));
                  driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//ul[@id='cboAdapter_listbox']//li[@role='option' and text()='PCORnet CDM']")));
                  driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//a[@class='k-link' and text()='Installed Models']")));
                  driver.wait(function() { return driver.findElement(By.id('btnInstallModel')).isDisplayed(); }, 5000)
                        .then(function() {
                            driver.findElement(By.id('btnInstallModel')).click();
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
}
