/**
 * app.js
 *
 * This file ties everything together. It is the main entrypoint into the project
 * and parses runtime arguments that call the appropriate use case.
 */

var nconf = require('nconf');
var argv = require('minimist')(process.argv.slice(2));
var colors = require('colors/safe');

// Homemade modules
var create_orgs = require('./orgs/create_orgs.js');
var create_org_security_groups = require('./orgs/create_org_security_groups.js');
var set_org_permissions = require('./orgs/set_org_permissions.js');
var create_dms = require('./datamarts/create_datamarts.js');
var add_dms_to_project = require('./datamarts/add_datamarts_to_project.js');
var create_users = require('./users/create_users.js');
var analysis = require('./util/entity_analysis.js');

nconf.file({
    file: 'config.json'
});

console.log(colors.magenta('INFO:') + ' Starting up...');
console.log(colors.magenta('INFO:') + ' Reading from config file... (\'./config.json\')');
console.log(colors.magenta('INFO:') + ' Setting variables...');

// Set config variables
var ORG_PERMISSIONS = nconf.get('organizations:org_operations:permissions');
var ORG_SECURITY_GROUPS = nconf.get('organizations:org_operations:security_groups');
var ORG_SET = nconf.get('organizations:org_set');
var PARENTS = nconf.get('organizations:' + ORG_SET);
var DM_TYPES = nconf.get('datamarts:dm_types');
var DM_PERMISSIONS = nconf.get('datamarts:dm_operations:security_groups');
var USER_TYPES = nconf.get('users:user_types');

console.log(colors.green('INFO:') + ' Working with server \'' + nconf.get('server') + '\'.');
console.log(colors.green('INFO:') + ' ORG_SET is set to \'' + ORG_SET + '\'.');
console.log(colors.green('INFO:') + ' NCONF set all variables.');
console.log(colors.magenta('INFO:') + ' Parsing arguments...');

/**
 * Create organiations.
 */
if (argv.entity === "orgs" && argv.operation === "create") {
    console.log(colors.magenta('INFO:') + ' Beginning organization creation...');
    var parents_created = 0;
    PARENTS.forEach(function(parent, index) {
        create_orgs.createParent(parent.name, parent.acronym, parent.children, function() {
            parents_created++;
            if (parents_created == PARENTS.length) {
                console.log('INFO: Organization creation completed.');
            }
        });
    });
/**
 * Set organization security groups.
 */
} else if (argv.entity === "orgs" && argv.operation === "sgs") {
    console.log(colors.magenta('INFO:') + ' Assigning security groups to all organizations...');
    // get the uids for every org just created and store in nconf
    analysis.getUids(function(uids) {
        // then assign their security groups
        var num_of_sgs_assigned = 0;
        var orgs = uids['orgs'];
        var uids = uids['uids'];
        orgs.forEach(function(org, index) {
            ORG_SECURITY_GROUPS.forEach(function(security_group, index) {
                create_org_security_groups.assignSecurityGroup(org, uids[org], security_group, function() {
                    num_of_sgs_assigned++;
                    if (num_of_sgs_assigned === orgs.length * ORG_SECURITY_GROUPS.length) {
                        console.log(colors.green('INFO:') + ' Security groups assigned.');
                    }
                });
            });
        });
    });
/**
 * Assign organization permissions.
 */
} else if (argv.entity === "orgs" && argv.operation === "perms") {
    console.log(colors.magenta('INFO:') + ' Assigning permissions for all organizations...');
    analysis.getUids(function(uids) {
        var num_of_perms_set = 0;
        var orgs = uids['orgs'];
        var uids = uids['uids'];
        orgs.forEach(function(org, index) {
            // SET ORGANIZATION PERMISSIONS
            ORG_PERMISSIONS.forEach(function(permission, index) {
                set_org_permissions.setPermissions(org, uids[org], permission, function() {
                    num_of_perms_set++;
                    if (num_of_perms_set === orgs.length * ORG_PERMISSIONS.length) {
                        console.log(colors.green('INFO:') + ' Done setting permissions.');
                    }
                });
            });
        });
    });
/**
 * Create datamarts.
 */
} else if (argv.entity === "dms" && argv.operation === "create") {
    console.log(colors.magenta('INFO:') + ' Beginning datamart creation...');

    var org_acro_dict = [];
    for (var a = 0; a < PARENTS.length; a++) {
        var parent = {};
        parent[PARENTS[a].name  ] = PARENTS[a].acronym;
        org_acro_dict.push(parent);
        for (var b = 0; b < PARENTS[a].children.length; b++) {
            var child = {};
            child[PARENTS[a].children[b]] = PARENTS[a].acronym + PARENTS[a].children[b].split('-')[1];
            org_acro_dict.push(child);
        }
    }

    var num_of_dms_created = 0;
    org_acro_dict.forEach(function(org, index) {
        for (var key in org) {
            DM_TYPES.forEach(function(type, index) {
                create_dms.createDataMart(key, org[key], type, function() {
                    num_of_dms_created++;
                    if (num_of_dms_created === org_acro_dict.length * DM_TYPES.length) {
                        console.log(colors.green('INFO:') + ' Datamart creation complete.');
                    }
                });
            });
        }
    });
/**
 * Assign datamarts to the appropriate project.
 */
} else if (argv.entity === "dms" && argv.operation === "project") {
    var dms = [];
    console.log(colors.magenta('INFO:') + ' Adding all unassigned DataMarts to the project.');
    analysis.getDmsAdded(function(dmsAlreadyAdded) {
        console.log(colors.yellow('INFO:') + ' About to get all uids and the list of orgs...');
        analysis.getUids(function(uids) {
            var orgs = uids['orgs'];
            for (var i = 0; i < orgs.length; i++) {
                DM_TYPES.forEach(function(type, index) {
                    dms.push(orgs[i] + ' ' + type);
                });
            }

            var num_of_dms_assigned_to_projects = 0;
            dms.forEach(function(dm, index) {
                add_dms_to_project.addDataMartToProject(dm, DM_PERMISSIONS, index, dmsAlreadyAdded, function() {
                    num_of_dms_assigned_to_projects++;
                    if (num_of_dms_assigned_to_projects === dms.length * DM_PERMISSIONS.length) {
                        console.log(colors.green('INFO:') + ' All Datamarts have been assigned to a project.');
                    }
                });
            });
        });
    });
/**
 * Create users.
 */
} else if (argv.entity === "users" && argv.operation === "create") {
    console.log(colors.magenta('INFO:') + ' Creating all users...');
    var num_of_users_set_for_orgs = 0;
    analysis.getUids(function(uids) {
        var orgs = uids['orgs'];
        orgs.forEach(function(org, index) {
            USER_TYPES.forEach(function(type, index) {
                var uFirstName = "UO";
                var oNameSplit = org.split(" ");

                if (oNameSplit[2].split("-").length === 2) {
                    uFirstName += oNameSplit[2].split("-")[0] + oNameSplit[2].split("-")[1];
                } else {
                    uFirstName += oNameSplit[2];
                }

                var uLastName = "";
                if (type === "DataMart Administrator") {
                    uLastName = "DMAdmin";
                } else {
                    uLastName = "OrgAdmin";
                }

                create_users.createUser(org, uFirstName, uLastName, "support@popmednet.org", uFirstName + uLastName, "Welcome123!", function() {
                    num_of_users_set_for_orgs++;
                    if (num_of_users_set_for_orgs === orgs.length * USER_TYPES.length) {
                        console.log(colors.green('INFO:') + ' All users created.');
                    }
                });
            });
        });
    });
/**
 * Any other arguments passed or if no arguments passed then alert and exit.
 */
} else {
    console.log(colors.red('ERROR:') + ' Invalid arguments provided.')
    process.exit();
}
