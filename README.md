# To Prepare Each Year
- [ ] Reconcile all INCOMING transactions from the year
- [ ] Add email addresses in Xero for all givers for the year
- [ ] Update "Giving Receipts" docx templates to include the correct year
- [ ] Make sure code is pulling in the correct template

## Code Preparation
- [ ] Download Git. Done via Terminal (mac) or download via project
- [ ] Download code editor (suggestions: VS code)
- [ ] This is when you add the code from GLC giving receipts gitlab

## Prepare the Data
- [ ] Create "input" folder
- [ ] Create "out" folder
- [ ] Pull down "Detailed Account Transaction Report" (Or a custom report with relevent data) and save as `accounts.csv`:
    - [ ] change titles to `code	account	Date	Type	Transaction	Reference	Gross	Sales Tax	Net	Sales Tax Rate	Sales Tax Name	Fund	Department`
    - [ ] Delete the rows above the "Date Source Contact etc ..." row
    - [ ] make sure Gross is number type, not dollar type
    - [ ] Change Account Code to code
    - [ ] Change Account to account
    - [ ] sort by date 

- [ ] Pull down "Income by Contact" (use the new one now):
    - [ ] add headers as: `name amount`
    - [ ] save as `contacts2022.csv`

- [ ] Create the file `emailList2024.csv` by pulling from Xero in "Export Contact List"
    - [ ] change titles to `name` and `email`

- [ ] Add them both to the input folder

## Create giving receipt docx files
- [ ] Run instructions:
    - `npm install`
    - `node readTransactions.js`

### Convert docx files to pdf (MacOS version using LibreOffice)
- [ ] Install LibreOffice
- [ ] Run commands:
```
alias batch_convert="/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf"
cd out
batch_convert *.docx
```
### Convert docx files to pdf (Windows version using VB script)
- [ ] Run the toPdfOnWindows VB script (there is also a mac workflow automation method)

## Email pdfs to givers
- [ ] Go to: https://developers.google.com/oauthplayground/?code=4/0AWtgzh4xYsXfCH1Xp6Ig0wRZeUsTMTG3XY5OoznFSkRh4HCv94jdmKSUnE12XeMgAHQZYQ&scope=https://mail.google.com/
    - [ ] Step 1: Select and authorize APIs (gmail v1)
    - [ ] Step 2: Exchange authorization --> Gets REFRESH_TOKEN and ACCESS_TOKEN
- [ ] CLIENT_ID and SECRET can be found here: https://console.cloud.google.com/apis/credentials/oauthclient/159547079324-t8892q0rda4iinqu5gkde8oim3q8jof4.apps.googleusercontent.com?authuser=1&project=glc-mailer
    - [ ] Make sure all APIs under gmail are selected
### Set environment variables for email app (Windows version)
- [ ] if using Windows powershell, SET envs with `$env:ACCESS_TOKEN=""`, etc.
- `$env:REFRESH_TOKEN=""`
- `$env:ACCESS_TOKEN=""`
- `$env:CLIENT_ID=""`
- `$env:CLIENT_SECRET=""`

### Set environment variables for email app (MacOS version)
- [ ] if using MacOS terminal, SET envs with `export ACCESS_TOKEN=""`, etc.
- `export REFRESH_TOKEN=""`
- `export ACCESS_TOKEN=""`
- `export CLIENT_ID=""`
- `export CLIENT_SECRET=""`
- [ ] Run `node emailer/index.js` --> there is a commented out line to only send to John for the first time


Notes:
- make sure there are no `/`s or other similar characters in Transaction or name
- After, run the workflow automation (you'll have to accept file edit permissions) to create pdfs
- TODO: make it so it doesn't save as `.docx.pdf` and does `.pdf` instead