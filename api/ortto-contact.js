export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      firstName, lastName, email, phone, countryCode, country,
      results, utmParams
    } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing email' });
    }

    const ORTTO_API_KEY = process.env.ORTTO_API_KEY;
    if (!ORTTO_API_KEY) {
      console.error('Missing ORTTO_API_KEY');
      return res.status(200).json({ success: true, warning: 'CRM not configured' });
    }

    const ORTTO_ENDPOINT =
      process.env.ORTTO_ENDPOINT || 'https://api.eu.ap3api.com/v1/activities/create';

    // Ortto expects phone country code WITHOUT +
    const phoneCode = String(countryCode || '').replace('+', '').trim();
    const phoneNumber = String(phone || '').trim();

    const orttoBody = {
      activities: [
        {
          activity_id: 'act:cm:websiteformsubmit',
          attributes: {
            'phn:cm:mobile-number-user-input': { c: phoneCode, n: phoneNumber },
            'str:cm:country-of-residence-user-input': country || '',
            'str:cm:email': email || '',
            'str:cm:first-name-user-input': firstName || '',
            'str:cm:last-name-user-input': lastName || '',
            'str:cm:your-questions-user-input-on-the-event-forms': JSON.stringify({
              tool: 'risk-questionnaire',
              riskScore: results?.riskScore || 0,
              riskProfile: results?.riskProfile || '',
              suggestedAllocation: results?.suggestedAllocation || { stocks: 0, bonds: 0, reserves: 0 },
              currentAllocation: results?.currentAllocation || { stocks: 0, bonds: 0, reserves: 0 },
              answers: results?.answers || {}
            }),
            'str:cm:source-page-url': '',
            'str:cm:topic-page-title': '',
            ...(utmParams?.utm_source ? { 'str:cm:utm-source': utmParams.utm_source } : {}),
            ...(utmParams?.utm_medium ? { 'str:cm:utm-medium': utmParams.utm_medium } : {}),
            ...(utmParams?.utm_campaign ? { 'str:cm:utm-campaign': utmParams.utm_campaign } : {}),
            ...(utmParams?.utm_term ? { 'str:cm:utm-term': utmParams.utm_term } : {}),
            ...(utmParams?.utm_content ? { 'str:cm:utm-content': utmParams.utm_content } : {})
          },
          fields: {
            'str::email': email
          },
          location: {
            source_ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
            custom: null,
            address: null
          }
        }
      ],
      merge_by: ['str::email']
    };

    const r = await fetch(ORTTO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ORTTO_API_KEY
      },
      body: JSON.stringify(orttoBody)
    });

    const text = await r.text();
    if (!r.ok) console.error(`ORTTO_FAIL status=${r.status} body=${text}`);

    return res.status(200).json({ success: true, ok: r.ok });

  } catch (error) {
    console.error('Ortto API Error:', error);
    return res.status(200).json({ success: true, warning: 'CRM sync failed silently' });
  }
}
