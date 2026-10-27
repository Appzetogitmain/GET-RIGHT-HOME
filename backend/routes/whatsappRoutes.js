import express from 'express';

const router = express.Router();

/**
 * Receives WhatsApp events forwarded by the GRH Infinity Media platform
 * (message status, incoming messages). The platform POSTs JSON here.
 *
 * It always answers 200 quickly so the platform does not retry. If
 * WHATSAPP_WEBHOOK_TOKEN is set in .env, the request must carry it as
 * ?token=... (add it to the webhook URL in the platform), otherwise it is rejected.
 */
const authorised = (req) => {
  const expected = process.env.WHATSAPP_WEBHOOK_TOKEN;
  return !expected || req.query.token === expected;
};

// Some platforms check the URL with a GET first.
router.get('/webhook', (req, res) => {
  if (!authorised(req)) return res.sendStatus(403);
  res.status(200).send(req.query['hub.challenge'] || 'ok');
});

router.post('/webhook', (req, res) => {
  if (!authorised(req)) return res.sendStatus(403);
  res.sendStatus(200);
  // Payload format is confirmed from the platform docs; for now just record it.
  try {
    console.log('[WhatsApp webhook]', JSON.stringify(req.body).slice(0, 2000));
  } catch { /* never fail the webhook */ }
});

export default router;
