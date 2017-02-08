var fs = require('fs');
var nconf = require('nconf');
var webdriver = require('selenium-webdriver');
var sleep = require('sleep-promise');
var build_driver = require('./build_driver.js');
var By = webdriver.By;
var until = webdriver.until;

nconf.file({
    file: 'config.json'
});

var POPMEDNET_URLS = nconf.get('popmednet_urls');
var ORG_SET = nconf.get('organizations:org_set');
var PARENTS = nconf.get('organizations:' + ORG_SET);

var exports = module.exports = {};

exports.get_uids = function(callback) {
    console.log('INFO: Getting UIDs for all orgs...');
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
                        console.log('INFO: Got all UIDs.');
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
