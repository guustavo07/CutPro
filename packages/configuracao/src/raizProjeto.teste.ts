import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ_PROJETO, resolverAPartirDaRaiz } from './index.js';

describe('raiz do projeto', () => {
  it('aponta para o diretório que contém o tsconfig base', () => {
    expect(existsSync(join(RAIZ_PROJETO, 'tsconfig.base.json'))).toBe(true);
  });

  it('não depende do diretório de trabalho do processo', () => {
    expect(existsSync(join(RAIZ_PROJETO, 'package-lock.json'))).toBe(true);
  });

  it('resolve caminho relativo a partir da raiz', () => {
    expect(resolverAPartirDaRaiz('./armazenamento')).toBe(join(RAIZ_PROJETO, 'armazenamento'));
  });

  it('mantém caminho absoluto intacto', () => {
    const absoluto = join(RAIZ_PROJETO, 'captura');
    expect(resolverAPartirDaRaiz(absoluto)).toBe(absoluto);
  });
});
