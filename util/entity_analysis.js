/**
 * entity_analysis.js
 *
 * Module that analyzes existing organizations and datamarts to extract information
 * from the ui. Uids for organizations are used by the application to build profile urls.
 * DataMart analysis is done here to identify which have been added to a project for
 * restarting on failure.
 */

var fs = require('fs');
var nconf = require('nconf');
var webdriver = require('selenium-webdriver');
var sleep = require('sleep-promise');
var build_driver = require('./build_driver.js');
var colors = require('colors/safe');
var By = webdriver.By;
var until = webdriver.until;

nconf.file({
    file: 'config.json'
});

var POPMEDNET_URLS = nconf.get('popmednet_urls:' + nconf.get('server'));
var ORG_SET = nconf.get('organizations:org_set');
var PARENTS = nconf.get('organizations:' + ORG_SET);
var SERVER_NAME = nconf.get('server');

var exports = module.exports = {};

/**
 * Generates an organization list (parents + children) and gets uids for each one.
 * @callback {getUidsCallback} callback - The callback that works with the uids and org list.
 * @return {object} {{uids: {org_name: uid}, orgs: [org_name]}}
 */
exports.getUids = function(callback) {
    console.log(colors.magenta('INFO:') + ' Getting UIDs for all orgs...');

    // build a full org list
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

    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.org_list_url, function(driver) {
        driver.wait(until.elementLocated(By.linkText(PARENTS[0].name)), 15000).then(function() {
            var num_of_uids_found = 0;
            var orgs = [];
            for (var key in orglist) {
                if (orglist.hasOwnProperty(key)) {
                    orgs.push(key);
                }
            }

            driver.wait(sleep(1500)).then(function() {
                orgs.forEach(function(org, index) {
                    driver.wait(function() {
                        return driver.findElement(By.xpath("//a[text() = '" + org + "']")).getAttribute('href');
                    }).then(function(href) {
                        num_of_uids_found++;
                        orglist[org] = href.split("=")[1];
                        if (num_of_uids_found === total_num_of_orgs) {
                            driver.quit();
                            console.log(colors.green('INFO:') + ' Got all UIDs.');
                            callback({
                                "uids": orglist,
                                "orgs": orgs
                            });
                        }
                    });
                });
            });
        });
    });
}

/**
 * Gets DataMarts already been added to the main project - only called by datamarts/add_datamarts_to_project.js
 * @callback {getDmsAddedCallback} callback - The callback that works with the array of datamarts.
 * @return {Array.String} - DataMarts already added to the project.
 */
exports.getDmsAdded = function(callback) {
    console.log(colors.yellow('INFO:') + ' Checking which DataMarts have already been added.');

    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.dm_project_url, function(driver) {
        // build the xpath for the DataMarts tab based on which server we're using
        var dm_tab_xpath = "";
        if (SERVER_NAME === "edge") {
            dm_tab_xpath = "//div[@id='tabs']//a[@class='k-link' and text()='DataMarts']";
        } else if (SERVER_NAME === "pmnuat") {
            dm_tab_xpath = "//div[@id='tabs']//span[@class='k-link' and text()='DataMarts']";
        }

        driver.wait(until.elementLocated(By.xpath(dm_tab_xpath)), 20000)
              .then(function() {
                  driver.findElement(By.xpath(dm_tab_xpath)).click();
                  driver.findElements(By.xpath("//div[@id='DataMartTable']//tbody//tr//td[@data-bind='text: DataMart']"))
                        .then(function(els) {
                            if (els.length === 0) {
                                driver.quit();
                                callback([]);
                            } else {
                                var dms = [];
                                var els_iterated = 0;
                                els.forEach(function(el, index) {
                                    el.getAttribute('outerText').then(function(text) {
                                        dms.push(text);
                                        els_iterated++;
                                        if (els_iterated === els.length) {
                                            driver.quit();
                                            console.log(colors.green('INFO:') + ' Found all DataMarts succesfully.');
                                            callback(dms);
                                        }
                                    });
                                });
                            }
                         });
               });
    });
}

/** RETIRED
 * Gets users already been added to the main project - only called by users/create_users.js
 * Need to manually scroll down to the bottom of the Users list...!
 * @callback {getUsersAddedCallback} callback - The callback that works with the array of datamarts.
 * @return {Array.String} - Users already added to the project.
 */

/*
exports.getUsersAdded = function(callback) {
    console.log(colors.magenta('INFO:') + ' Getting all users already created...');

    // build a full org list
    var orglist = [];
    var total_num_of_orgs = 0;
    for (var a = 0; a < PARENTS.length; a++) {
        orglist.push(PARENTS[a].name);
        total_num_of_orgs++;
        for (var b = 0; b < PARENTS[a].children.length; b++) {
            total_num_of_orgs++;
            orglist.push(PARENTS[a].children[b]);
        }
    }

    // build usernames for every org
    var usernamelist = [];
    for (var j = 0; j < orglist.length; j++) {
        var uFirstName = "UO";
        var oNameSplit = orglist[j].split(" ");

        if (oNameSplit[2].split("-").length === 2) {
            uFirstName += oNameSplit[2].split("-")[0] + oNameSplit[2].split("-")[1];
        } else {
            uFirstName += oNameSplit[2];
        }

        usernamelist.push(uFirstName + "DMAdmin");
        usernamelist.push(uFirstName + "OrgAdmin");
    }

    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.user_list_url, function(driver) {
        driver.wait(until.elementLocated(By.xpath("//tbody//a[text()='zwyner']")))
              .then(function() {
                  driver.findElements(By.xpath("//tbody//a"))
                        .then(function(els) {
                            var users = []; // array that stores usernames got from page
                            var users_iterated = 0;
                            els.forEach(function(el, index) {
                                el.getAttribute('outerText').then(function(text) {
                                    users.push(text);
                                    users_iterated++;
                                    if (users_iterated === els.length) {
                                        var last_uat = "";
                                        console.log('users:');
                                        console.log(users);
                                        for (var i = users.length - 1; i >= 0; i--) {
                                            if (users[i].indexOf('UO') > -1) {
                                                last_uat = users[i];
                                                break;
                                            }
                                        }

                                        console.log('last_uat: ' + last_uat + '.');
                                        console.log('indexof: ' + usernamelist.indexOf(last_uat));
                                        usernamelist.slice(0, usernamelist.indexOf(last_uat) + 1);

                                        console.log(colors.green('INFO:') + ' Got all users already added.');
                                        driver.quit();
                                        console.log('usernamelist:');
                                        console.log(usernamelist);
                                        callback(usernamelist);
                                    }
                                });
                            });
                        });
              });
    });
}
*/
