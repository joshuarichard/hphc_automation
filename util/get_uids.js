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

var exports = module.exports = {};

exports.get_uids = function(callback) {
    console.log(colors.magenta('INFO:') + ' Getting UIDs for all orgs...');
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
}

exports.get_dms_added = function(callback) {
    console.log(colors.yellow('INFO:') + ' Checking which DataMarts have already been added.');

    build_driver.buildDriverAndSignIn(POPMEDNET_URLS.dm_edge_project_url, function(driver) {
        driver.wait(until.elementLocated(By.xpath("//div[@id='tabs']//a[@class='k-link' and text()='DataMarts']")), 20000)
              .then(function() {
                  driver.findElement(By.xpath("//div[@id='tabs']//a[@class='k-link' and text()='DataMarts']")).click();
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
