// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadCSV } from './csv-export';

describe('downloadCSV', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('escapes RFC 4180 values, formats Date/null/undefined, and stamps the filename', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-24T10:00:00Z'));

        let capturedBlob: Blob | null = null;
        const createObjectURL = vi
            .spyOn(URL, 'createObjectURL')
            .mockImplementation((obj) => {
                capturedBlob = obj as Blob;
                return 'blob:mock-csv-url';
            });
        const revokeObjectURL = vi
            .spyOn(URL, 'revokeObjectURL')
            .mockImplementation(() => {});

        let clickedDownload = '';
        let clickedHref = '';
        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(function (this: HTMLAnchorElement) {
                clickedDownload = this.download;
                clickedHref = this.href;
            });

        downloadCSV(
            'eirmis-audit-log.csv',
            ['Timestamp', 'Label', 'Note', 'Empty'],
            [
                [
                    new Date('2026-12-10T09:15:00Z'),
                    'Admin, "Primary"',
                    'Line 1\nLine 2',
                    null,
                ],
                ['2026-12-11T14:30:00+08:00', 'System', undefined, true],
            ],
        );

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-csv-url');
        expect(clickedHref).toBe('blob:mock-csv-url');
        expect(clickedDownload).toBe('eirmis-audit-log-2026-11-24.csv');
        expect(capturedBlob).not.toBeNull();
        expect(capturedBlob!.type).toBe('text/csv;charset=utf-8');

        const content = await capturedBlob!.text();
        expect(content).toBe(
            [
                'Timestamp,Label,Note,Empty',
                '2026-12-10T09:15:00.000Z,"Admin, ""Primary""","Line 1\nLine 2",',
                '2026-12-11T14:30:00+08:00,System,,true',
                '',
            ].join('\r\n'),
        );
    });
});
