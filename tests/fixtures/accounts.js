// Sample account transaction rows (matching Xero CSV export shape)
const accounts = [
    { code: '1000', Name: 'John Smith', Gross: '500.00', Date: '2024-01-15', Description: 'General Offering' },
    { code: '1001', Name: 'Jane Doe', Gross: '250.00', Date: '2024-02-10', Description: 'Building Fund' },
    { code: '1000', Name: 'John Smith', Gross: '300.00', Date: '2024-03-20', Description: 'General Offering' },
    { code: '9999', Name: 'John Smith', Gross: '100.00', Date: '2024-04-01', Description: 'Non-deductible' },
    { code: '3000', Name: 'Alice Johnson', Gross: '50.00', Date: '2024-05-05', Description: 'Missions' },
    { code: '4000', Name: 'Bob Williams', Gross: '1200.00', Date: '2024-06-01', Description: 'General Offering' },
    { code: '1002', Name: 'Carol Brown', Gross: '60.00', Date: '2024-07-10', Description: 'Youth Fund' },
    { code: '5002', Name: 'No Match Person', Gross: '400.00', Date: '2024-08-01', Description: 'General' },
];

module.exports = accounts;
