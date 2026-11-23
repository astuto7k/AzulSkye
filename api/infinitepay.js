import { CheckoutError, makeService } from '../server/infinitepay.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const service = makeService();
  const action = req.query?.action;
  try {
    if (req.method === 'GET' && action === 'config') {
      return res.status(200).json({ enabled: service.config.ready, deliveryMode: service.config.deliveryMode || null, shippingCents: service.config.shippingCents || 0 });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Método não permitido.' }); }
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new CheckoutError('Envie JSON.', 415);
    if (Number(req.headers['content-length'] || 0) > 12000) throw new CheckoutError('Solicitação muito grande.', 413);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || JSON.stringify(body).length > 12000) throw new CheckoutError('Solicitação inválida.');
    if (action !== 'webhook' && req.headers.origin !== service.config.origin) throw new CheckoutError('Origem não permitida.', 403);
    let result;
    if (action === 'checkout') result = await service.create(body, String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0]);
    else if (action === 'status') result = await service.status(body, String(req.headers.authorization || '').replace(/^Bearer /, ''));
    else if (action === 'webhook') result = await service.webhook(body);
    else throw new CheckoutError('Rota não encontrada.', 404);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof CheckoutError) return res.status(error.status).json({ error: error.message });
    // Never log request bodies or provider errors: they may contain customer details or credentials.
    return res.status(503).json({ error: 'Não foi possível concluir a operação. Tente novamente.' });
  }
}
