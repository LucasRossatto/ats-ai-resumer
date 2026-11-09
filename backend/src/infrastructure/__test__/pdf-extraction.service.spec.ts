import { PDFParse } from 'pdf-parse';
import {
  MAX_PDF_PAGES,
  PdfExtractionError,
  PdfExtractionService,
  PdfTooLongError,
} from '@infrastructure/pdf/pdf-extraction.service';

/**
 * pdf.js cannot load inside Jest (it needs dynamic imports), so the parser is
 * replaced. Run by hand against a real 12-page PDF: `getText({ first: 10 })`
 * returns 10 `pages` and `total: 12`, which is what the limit relies on.
 */
jest.mock('pdf-parse', () => ({ PDFParse: jest.fn() }));

describe('PdfExtractionService', () => {
  const logger = { logger: jest.fn(), err: jest.fn() };
  const service = new PdfExtractionService(logger as never);
  const getText = jest.fn();
  const destroy = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (PDFParse as unknown as jest.Mock).mockImplementation(() => ({
      getText,
      destroy,
    }));
  });

  it('extracts the text of a PDF within the page limit', async () => {
    getText.mockResolvedValue({
      text: 'Page 1',
      total: 3,
      pages: [{}, {}, {}],
    });

    const result = await service.extractText(Buffer.from('x'));

    expect(result).toEqual({ text: 'Page 1', meta: { numPages: 3 } });
    expect(getText).toHaveBeenCalledWith({
      pageJoiner: '',
      first: MAX_PDF_PAGES,
    });
  });

  it('accepts a PDF with exactly the page limit', async () => {
    getText.mockResolvedValue({
      text: 'x',
      total: MAX_PDF_PAGES,
      pages: new Array(MAX_PDF_PAGES).fill({}),
    });

    const result = await service.extractText(Buffer.from('x'));

    expect(result.meta.numPages).toBe(MAX_PDF_PAGES);
  });

  it('refuses a PDF with more pages than the limit and still frees the parser', async () => {
    getText.mockResolvedValue({
      text: 'x',
      total: MAX_PDF_PAGES + 2,
      pages: new Array(MAX_PDF_PAGES).fill({}),
    });

    await expect(service.extractText(Buffer.from('x'))).rejects.toBeInstanceOf(
      PdfTooLongError,
    );
    expect(destroy).toHaveBeenCalled();
  });

  it('wraps a parser failure in PdfExtractionError', async () => {
    getText.mockRejectedValue(new Error('bad xref'));

    await expect(service.extractText(Buffer.from('x'))).rejects.toBeInstanceOf(
      PdfExtractionError,
    );
  });
});
