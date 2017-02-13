# HPHC Automation
Harvard Pilgrim Health Care automation utilities for building a data set for application testing.

### Prerequisites
Prerequisites for this utility include Node.js and a webdriver of your choice.

1. Install Node.js.
  - Using a package management system or direct installer:
    - Unix: `$ sudo apt-get install nodejs`
    - Mac OSX: `$ brew install nodejs`
    - Windows: Download and run an installer: https://nodejs.org/en/download/

  - And manually symlink 'nodejs' with 'node':
      - ``$ sudo ln -s `which nodejs` /usr/bin/node``

2. Download a webdriver and put it in your PATH.
  - Download a webdriver using the below link (scroll down to: "Third Party Browser Drivers").
      - http://docs.seleniumhq.org/download/
  - To put the file in your PATH
      - Mac OSX/Unix Systems
          - `$ PATH=$PATH:/path/to/webdriver`
      - Windows
          - http://windowsitpro.com/systems-management/how-can-i-add-new-folder-my-system-path

3. Get the source code for the project by downloading as a zip or using git on the command line.
  - `$ git clone https://www.github.com/joshuarichard/hphc_automation.git`

### Configuration
Configuration is stored in `config.json`. This is where your credentials and the test data's organization structure are stored. Add your credentials to the configuration file and ensure that the structure of the test data in this file is appropriate for what you are trying to add to PopMedNet.

### Building
Run `$ npm install` in the top most directory of the project.

### Running
When running the software, there are two options that are required. Firstly, the `--entity` flag denotes the entity you would like to operate with (currently just organizations and datamarts are supported). Secondly, the `--operation` flag denotes the operation you would like to execute.

Below are the commands that should be used to run this automation software. Cater the command line arguments to which operation you would like to automate. Any other options will not be accepted as valid.

#### Organization
- Organization creation: `$ node app.js --entity org --operation create`
- Create organization security groups: `$ node app.js --entity org --operation sgs`
- Set organization permissions: `$ node app.js --entity org --operation perms`

#### DataMarts
- DataMart creation: `$ node app.js --entity dms --operation create`
- Add DataMarts to a project: `$ node app.js --entity dms --operation projects`
