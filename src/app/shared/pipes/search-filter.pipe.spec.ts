import { SearchFilterPipe } from './search-filter.pipe';

describe('SearchFilterPipe', () => {
  const pipe = new SearchFilterPipe();

  it('returns an empty array for null/undefined input', () => {
    expect(pipe.transform(null, 'x')).toEqual([]);
    expect(pipe.transform(undefined, 'x')).toEqual([]);
  });

  it('returns all items when the term is empty', () => {
    const data = [{ nombre: 'Ana' }, { nombre: 'Beto' }];
    expect(pipe.transform(data, '')).toEqual(data);
    expect(pipe.transform(data, '   ')).toEqual(data);
  });

  it('filters ignoring case and accents', () => {
    const data = [{ nombre: 'José' }, { nombre: 'Ana' }];
    expect(pipe.transform(data, 'jose')).toEqual([{ nombre: 'José' }]);
  });

  it('filters using nested key paths', () => {
    const data = [
      { persona: { nombre: 'Juan' } },
      { persona: { nombre: 'Pedro' } },
    ];
    expect(pipe.transform(data, 'ped', ['persona.nombre'])).toEqual([
      { persona: { nombre: 'Pedro' } },
    ]);
  });

  it('searches across all fields when no keys are provided', () => {
    const data = [
      { nombre: 'Ana', email: 'ana@mail.com' },
      { nombre: 'Beto', email: 'beto@mail.com' },
    ];
    expect(pipe.transform(data, 'beto@mail')).toEqual([
      { nombre: 'Beto', email: 'beto@mail.com' },
    ]);
  });
});
