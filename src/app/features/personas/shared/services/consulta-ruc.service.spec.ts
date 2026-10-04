import { esRucConsultable, normalizarRuc } from './consulta-ruc.service';

describe('esRucConsultable', () => {
  it('acepta cédulas y RUC con o sin dígito verificador', () => {
    expect(esRucConsultable('1234567')).toBe(true);
    expect(esRucConsultable('80012345-6')).toBe(true);
    expect(esRucConsultable('4.567.890')).toBe(true);
  });

  it('no consulta mientras el número es muy corto o tiene otro formato', () => {
    expect(esRucConsultable('1234')).toBe(false);
    expect(esRucConsultable('ABC123')).toBe(false);
    expect(esRucConsultable('123456789')).toBe(false);
    expect(esRucConsultable('80012345-67')).toBe(false);
    expect(esRucConsultable('')).toBe(false);
  });

  it('normaliza puntos y espacios', () => {
    expect(normalizarRuc(' 4.567.890 ')).toBe('4567890');
  });
});
