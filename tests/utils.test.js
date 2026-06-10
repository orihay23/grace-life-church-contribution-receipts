const path = require('path');

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures', 'sample.csv');
const realFs = jest.requireActual('fs');

// Write the fixture file once before all tests that need it
beforeAll(() => {
    realFs.writeFileSync(FIXTURE_PATH, 'name,amount\nJohn Smith,500\nJane Doe,250\n');
});

afterAll(() => {
    if (realFs.existsSync(FIXTURE_PATH)) {
        realFs.unlinkSync(FIXTURE_PATH);
    }
});

describe('utils.read', () => {
    it('parses a CSV file into an array of objects', async () => {
        // csvtojson requires real disk access — use jest.requireActual to bypass fs mock
        const utils = jest.requireActual('../utils');
        const result = await utils.read(FIXTURE_PATH);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('John Smith');
        expect(result[1].amount).toBe('250');
    });
});

describe('utils.writeDoc', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.mock('fs', () => ({
            existsSync: jest.fn(),
            mkdirSync: jest.fn(),
            writeFileSync: jest.fn(),
            readFileSync: jest.fn().mockReturnValue(Buffer.from('')),
        }));
    });

    it('creates the out directory if it does not exist', async () => {
        const mockFs = require('fs');
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockImplementation(() => {});
        mockFs.writeFileSync.mockImplementation(() => {});
        mockFs.readFileSync.mockReturnValue(Buffer.from(''));

        // Mock JSZip and Docxtemplater so loadTemplate doesn't fail
        jest.mock('jszip', () => {
            return jest.fn().mockImplementation(() => ({
                file: jest.fn().mockReturnValue({ async: jest.fn().mockResolvedValue('') }),
            }));
        });
        jest.mock('docxtemplater', () => {
            return jest.fn().mockImplementation(() => ({
                loadZip: jest.fn(),
                setData: jest.fn(),
                render: jest.fn(),
                getZip: jest.fn().mockReturnValue({
                    generate: jest.fn().mockReturnValue(Buffer.from('fake-docx')),
                }),
            }));
        });

        const utils = require('../utils');
        const mockDoc = {
            render: jest.fn(),
            getZip: jest.fn().mockReturnValue({
                generate: jest.fn().mockReturnValue(Buffer.from('fake-docx')),
            }),
        };

        await utils.writeDoc(mockDoc, 'Test Person', 2024);

        expect(mockFs.mkdirSync).toHaveBeenCalled();
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('GLC_Contribution_Receipt_2024_Test Person.docx'),
            expect.any(Buffer)
        );
    });

    it('does not call mkdirSync if out directory already exists', async () => {
        const mockFs = require('fs');
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => {});

        const utils = require('../utils');
        const mockDoc = {
            render: jest.fn(),
            getZip: jest.fn().mockReturnValue({
                generate: jest.fn().mockReturnValue(Buffer.from('fake-docx')),
            }),
        };

        await utils.writeDoc(mockDoc, 'Test Person', 2024);

        expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
});

describe('utils.writeDocPg2', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.mock('fs', () => ({
            existsSync: jest.fn(),
            mkdirSync: jest.fn(),
            writeFileSync: jest.fn(),
            readFileSync: jest.fn().mockReturnValue(Buffer.from('')),
        }));
    });

    it('writes pg2 file with correct naming convention', async () => {
        const mockFs = require('fs');
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => {});

        const utils = require('../utils');
        const mockDoc = {
            render: jest.fn(),
            getZip: jest.fn().mockReturnValue({
                generate: jest.fn().mockReturnValue(Buffer.from('fake-docx')),
            }),
        };

        await utils.writeDocPg2(mockDoc, 'Test Person', 2024);

        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('GLC_Contribution_Receipt_2024_pg2_Test Person.docx'),
            expect.any(Buffer)
        );
    });

    it('uses current year when year is not provided', async () => {
        const mockFs = require('fs');
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => {});

        const utils = require('../utils');
        const mockDoc = {
            render: jest.fn(),
            getZip: jest.fn().mockReturnValue({
                generate: jest.fn().mockReturnValue(Buffer.from('fake-docx')),
            }),
        };

        const currentYear = new Date().getFullYear();
        await utils.writeDocPg2(mockDoc, 'Test Person');

        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining(`GLC_Contribution_Receipt_${currentYear}_pg2_Test Person.docx`),
            expect.any(Buffer)
        );
    });
});
