## To Prepare Each Year
- Reconcile all INCOMING transactions from the year
- Add email addresses in Xero for all givers for the year
- Update "Giving Receipts" docx templates to include the correct year
- Make sure code is pulling in the correct template

### Prepare the Data
Create "input" folder
Create "out" folder
Pull down "Detailed Account Transaction Report" and save as `accounts.csv`:
- change titles to `code	account	Date	Type	Transaction	Reference	Gross	Sales Tax	Net	Sales Tax Rate	Sales Tax Name	Fund	Department`
- make sure Gross is number type, not dollar type
- sort by date

Pull down "Income by Contact" (with filters: Date 2022, period: 12 months, compare with 0):
- add headers as: `name amount items`
- save as `contacts2022.csv`

Add them both to the input folder

Run instructions:
- `npm install`
- `node readTransactions.js`
- Run the toPdfOnWindows VB script (there is also a mac workflow automation method)
- Run `node emailer/index.js` --> there is a commented out line to only send to John for the first time

Notes:
- make sure there are no `/`s or other similar characters in Transaction or name
- After, run the workflow automation (you'll have to accept file edit permissions) to create pdfs
- TODO: make it so it doesn't save as `.docx.pdf` and does `.pdf` instead