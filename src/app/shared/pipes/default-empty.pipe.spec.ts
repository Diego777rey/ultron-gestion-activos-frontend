import { DefaultEmptyPipe } from './default-empty.pipe';

describe('DefaultEmptyPipe', () => {
  const pipe = new DefaultEmptyPipe();

  it('returns the default placeholder for null/undefined', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('returns a custom placeholder when provided', () => {
    expect(pipe.transform('', 'Sin datos')).toBe('Sin datos');
    expect(pipe.transform('   ', 'N/A')).toBe('N/A');
  });

  it('returns the trimmed value when present', () => {
    expect(pipe.transform('  hola  ')).toBe('hola');
  });

  it('keeps falsy-but-valid values like zero', () => {
    expect(pipe.transform(0)).toBe('0');
  });
});
