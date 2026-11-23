export function usableHandoff(value, cartKey, now = Date.now()) {
  if (!value || typeof cartKey !== 'string' || value.cartKey !== cartKey ||
      !/^AZ-[a-f0-9-]{36}$/.test(value.id) || !(Date.parse(value.expiresAt)>now)) return false;
  try {
    const link = new URL(value.url);
    return ['https://checkout.infinitepay.io', 'https://buy.infinitepay.io'].includes(link.origin) && !link.username && !link.password;
  } catch { return false; }
}
