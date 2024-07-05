// index.js
const express = require('express');
const path = require('path');
const QRCode = require('qrcode');
const crypto = require('crypto');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/submit', (req, res) => {
  const { username, number, referent } = req.body;
  const data = `${username}${number}${referent}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  const uuid = hash.slice(0, 36); // Use the first 36 characters of the hash as the UUID

  // Store the user information in the session (for simplicity, use a global object in this example)
  global.userData = { username, number, referent, uuid };

  res.redirect(`/uuid/${uuid}`);
});

app.get('/uuid/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  const { username, number, referent } = global.userData;

  if (uuid !== global.userData.uuid) {
    return res.status(404).send('Invalid UUID');
  }

  QRCode.toDataURL(uuid, { type: 'image/png' }, async (err, url) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error generating QR code');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Code Card</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          .card {
            width: 350px;
            height: 200px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            background-color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .qr-code {
            width: 100px;
            height: 100px;
          }
          .light-text {
            font-size: 0.875rem; /* text-sm */
            color: #6b7280; /* text-gray-500 */
          }
        </style>
      </head>
      <body class="bg-gray-100 flex items-center justify-center h-screen">
        <div class="card shadow-lg">
          <div class="text-lg font-bold">${username}</div>
          <img src="${url}" alt="QR Code" class="qr-code">
          <div>
            <div class="text-sm">${number}</div>
          </div>
          <div>
            <div class="text-sm">${referent}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="QRCodeCard.pdf"');
    res.send(pdfBuffer);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
