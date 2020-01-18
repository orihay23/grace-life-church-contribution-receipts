Create "input" folder
Create "out" folder
Pull down "Detailed Account Transaction Report" and save as `accounts.csv`:
- change titles to `code	account	Date	Type	Transaction	Reference	Gross	Sales Tax	Net	Sales Tax Rate	Sales Tax Name	Fund	Department`
- make sure Gross is number type, not dollar type

Pull down "Income by Contact" (Date 2019, period: 12 months, compare with 0):
- add headers as: `name amount items`
- save as `contacts2019.csv`

Add them both to the input folder

Run instructions:
`npm install`
`node readTransactions.js`

Notes:
- make sure there are no `/`s or other similar characters in Transaction or name