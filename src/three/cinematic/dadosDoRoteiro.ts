// Validação comum aos leitores de câmera e de sequência, só na montagem.
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
