// Validação comum aos leitores do roteiro, só na montagem.
export function erro(campo: string, motivo: string): never {
  throw new Error(`Roteiro: ${campo} ${motivo}`);
}

export function objeto(valor: unknown, campo: string): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return erro(campo, 'deve ser um objeto');
  }
  return valor as Record<string, unknown>;
}

export function numero(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return erro(campo, 'deve ser um número finito');
  }
  return valor;
}

export function lista(valor: unknown, campo: string): unknown[] {
  if (!Array.isArray(valor)) return erro(campo, 'deve ser uma lista');
  return valor;
}

export function texto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !valor.trim()) return erro(campo, 'deve ser texto não vazio');
  return valor;
}

export function opcional<T>(valor: unknown, campo: string, ler: (v: unknown, c: string) => T): T | undefined {
  return valor === undefined ? undefined : ler(valor, campo);
}

export function booleano(valor: unknown, campo: string): boolean {
  if (typeof valor !== 'boolean') return erro(campo, 'deve ser true ou false');
  return valor;
}
