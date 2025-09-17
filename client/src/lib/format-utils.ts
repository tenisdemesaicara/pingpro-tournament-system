// Formata CPF para o padrão XXX.XXX.XXX-XX
export function formatCPF(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos (CPF válido)
  const limitedNumbers = numbers.substring(0, 11);
  
  // Aplica a formatação progressiva
  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 6) {
    return limitedNumbers.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  } else if (limitedNumbers.length <= 9) {
    return limitedNumbers.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  } else {
    return limitedNumbers.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  }
}

// Remove formatação do CPF para envio ao backend
export function unformatCPF(value: string): string {
  return value.replace(/\D/g, '');
}

// Valida se CPF é válido (apenas estrutura básica)
export function isValidCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '');
  return numbers.length === 11;
}

// Formata telefone
export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
}

// Remove formatação do telefone
export function unformatPhone(value: string): string {
  return value.replace(/\D/g, '');
}