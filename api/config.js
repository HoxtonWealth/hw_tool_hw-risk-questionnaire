export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    bookingUrl: process.env.BOOKING_URL || 'https://hoxtonwealth.com/contact'
  });
}
