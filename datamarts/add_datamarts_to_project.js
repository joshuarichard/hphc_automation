var fs = require('fs');
var nconf  = require('nconf');
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

var exports = module.exports = {};

exports.addDataMartToProject = function(dName, permissions, dIndex, dms_already_added, callback) {
    // example oName = ['UAT', 'Org', 'A-2', 'Legacy', 'DataMart']
    var oName = dName.split(' ');
    oName = oName[0] + ' ' + oName[1] + ' ' + oName[2]; // + ' ' + oName[3];
    var offset = dIndex + dms_already_added.length;

    if (dms_already_added.indexOf(dName) > -1) {
        console.log(colors.green('INFO:') + ' ' + dName + ' has already been added to the project.');
        callback();
    } else {
        console.log(colors.yellow('INFO:') + ' Adding ' + dName + ' to the project.');
        build_driver.buildDriverAndSignIn(POPMEDNET_URLS.dm_edge_project_url, function(driver) {
            // wait for the DataMarts tab to load
            driver.wait(until.elementLocated(By.xpath("//div[@id='tabs']//a[@class='k-link' and text()='DataMarts']")), 20000)
                  .then(function() {
                      // click the Add DataMart button
                      driver.findElement(By.xpath("//div[@id='tabs']//a[@class='k-link' and text()='DataMarts']")).click();
                      driver.executeScript("arguments[0].click();", driver.findElement(By.id('btnAddDataMart')));
                      driver.wait(function() { return driver.findElement(By.xpath("//a//span[text()='" + dName + "']")).isDisplayed(); }, 20000)
                            .then(function() {
                                // click the datamart we're trying to add in the list that pops up
                                driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//a//span[text()='" + dName + "']")))
                                      .then(sleep(2000))
                                      .then(function() {
                                           // and wait for + button to appear next to the tr
                                           driver.wait(until.elementLocated(By.xpath("//tr//td[text()='" + dName + "']//..//img")), 35000)
                                                 .then(function() {
                                                     // once it is then click the + button on the tr
                                                     driver.executeScript("arguments[0].click();", driver.findElement(By.xpath("//tr//td[text()='" + dName + "']//..//img")));

                                                     var num_of_sgs_assigned = 0;
                                                     permissions.forEach(function(perm, index) {
                                                         var i = index;
                                                         console.log(colors.blue('INFO:') + ' Adding datamart (' + dName + " " + perm.admin_type + ')');
                                                         driver.findElements(By.xpath("//*[@id='DataMartTable']//div[@id='tabs-1']//*[@id='btnAddSecurityGroup']"))
                                                               .then(function(els) {
                                                                   driver.executeScript("arguments[0].click();", els[dIndex]); // click the appropriate "add security group" button
                                                                   // and wait for the security ORG_SET window popup (add 2 seconds wait time for chrome)
                                                                   driver.wait(function() { return driver.findElement(By.xpath("//iframe[@src='/security/SecurityGroupWindow']")).isDisplayed(); }, 20000)
                                                                         .then(sleep(2000))
                                                                         .then(function() {
                                                                             // once the security  window popup has loaded switch the frame
                                                                             driver.switchTo().defaultContent(); // have to switch to top first to ensure correct frame
                                                                             driver.switchTo().frame(0);

                                                                             // once we've switched then wait for the oName to pop up in the left hand tbody
                                                                             // function () { return driver.findElement(By.xpath("//td[@role='gridcell' and text()='" + oName + "']")).isDisplayed(); }
                                                                             driver.wait(until.elementLocated(By.xpath("//td[@role='gridcell' and text()='" + oName + "']")), 20000)
                                                                                   .then(function() {
                                                                                       // when the left tbody is loaded then click the appropriate oName button
                                                                                       if (perm.admin_type === "Operations Center/MassDataMartAdministrator") {
                                                                                           driver.findElement(By.xpath("//td[@role='gridcell' and text()='" + 'Operations Center' + "']")).click();
                                                                                       } else {
                                                                                           driver.findElement(By.xpath("//td[@role='gridcell' and text()='" + oName + "']")).click();
                                                                                       }
                                                                                       // and wait for the right side to load
                                                                                       driver.wait(until.elementLocated(By.xpath("//*[@id='gOrgSecResults']//tbody//tr[@class='k-alt']")), 20000)
                                                                                             .then(function() {
                                                                                                 // ...find the two tr's...
                                                                                                 driver.findElements(By.xpath("//*[@id='gOrgSecResults']//tbody//tr"))
                                                                                                       .then(function(els) {
                                                                                                           // ...and click the appropriate administrator tr
                                                                                                           if (perm.admin_type === "DataMart Administrator") {
                                                                                                               els[0].click();
                                                                                                           } else if (perm.admin_type === "Organization Administrator") {
                                                                                                               els[1].click();
                                                                                                           } else {
                                                                                                               els[els.length - 1].click();
                                                                                                           }

                                                                                                           // and switch back to the top
                                                                                                           driver.switchTo().defaultContent();

                                                                                                           // wait until we're back at the top
                                                                                                           driver.wait(until.elementLocated(By.xpath("//*[@id='DataMartTable']//tr//span[text()='" + perm.permissions[0] + "']//..//..//input[@value='allow']")), 50000)
                                                                                                                 .then(function() {
                                                                                                                     var num_of_perms_clicked = 0;
                                                                                                                     perm.permissions.forEach(function(p, ind) {
                                                                                                                         driver.findElements(By.xpath("//*[@id='DataMartTable']//tr//span[text()='" + p + "']//..//..//input[@value='allow']"))
                                                                                                                               .then(function(els) {
                                                                                                                                   driver.executeScript("arguments[0].click();", els[dIndex]); // click the appropriate allow permissions (multiple ones show up)
                                                                                                                                   driver.wait(sleep(1000)).then(function() {
                                                                                                                                       num_of_perms_clicked++;
                                                                                                                                       // once we've clicked all of them
                                                                                                                                       if (num_of_perms_clicked === perm.permissions.length) {
                                                                                                                                           // then finally click save
                                                                                                                                           driver.findElement(By.id('btnSave'))
                                                                                                                                                 .click()
                                                                                                                                                 .then(sleep(15000))
                                                                                                                                                 .then(function() {
                                                                                                                                                     driver.findElements(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")).then(function(els) {
                                                                                                                                                         if (els.length === 0) {
                                                                                                                                                             driver.findElement(By.id('btnSave')).click();
                                                                                                                                                         }
                                                                                                                                                         driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'k-overlay') and contains(@style, 'display: block')]")), 60000)
                                                                                                                                                               .then(function() {
                                                                                                                                                                   // and wait for the page to confirm successful save
                                                                                                                                                                   driver.findElements(By.id('btnOK'))
                                                                                                                                                                         .then(function(els) {
                                                                                                                                                                             //els[i].click();
                                                                                                                                                                             driver.executeScript("arguments[0].click();", els[i]);
                                                                                                                                                                             console.log(colors.green('INFO:') + ' Permission set for datamart (' + dName + ') with permission ' + perm.admin_type + '.');
                                                                                                                                                                             num_of_sgs_assigned++;
                                                                                                                                                                             if (num_of_sgs_assigned === permissions.length) {
                                                                                                                                                                                 // we're done so log, driver.quit(), and callback
                                                                                                                                                                                 console.log(colors.green('INFO:') + ' ' + dName + ' added to project.')
                                                                                                                                                                                 driver.quit();
                                                                                                                                                                                 callback();
                                                                                                                                                                             }
                                                                                                                                                                          });
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
    }
}
