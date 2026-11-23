// Shared by the browser and the checkout API. Preserve Brazilian area code 55.
export function brazilianPhone(input) {
  if (typeof input !== 'string') return '';
  const value = input.trim();
  if (!/^\+?[\d\s().-]+$/.test(value)) return '';
  let digits = value.replace(/\D/g, '');
  if (value.startsWith('+') || digits.startsWith('0055')) {
    if (!/^(0055|55)/.test(digits)) return '';
    digits = digits.replace(/^(0055|55)/, '');
  } else if (/^55\d{10,11}$/.test(digits)) {
    digits = digits.slice(2);
  }
  digits = digits.replace(/^0(?=[1-9]\d{9,10}$)/, '');
  return /^[1-9]\d{9,10}$/.test(digits) ? '+55' + digits : '';
}

export function checkoutContact(input) {
  const name = typeof input?.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = brazilianPhone(input?.phone);
  const errors = {};
  if (name.length < 2 || name.length > 140) errors.name = 'Informe seu nome com pelo menos 2 caracteres.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Confira o e-mail. Exemplo: nome@dominio.com.';
  if (!phone) errors.phone = 'Inclua o DDD e o número. Exemplo: (11) 91234-5678.';
  return { customer: { name, email, phone }, errors };
}
