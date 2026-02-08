const fs = require('fs');
const secret = 'NmMwOWNIM2EtZTEzMSO0YzQzLThiNzUtOTU3MTlyZjIzMDVh';
const decoded = Buffer.from(secret, 'base64').toString('utf8');
fs.writeFileSync('decoded_key.txt', decoded);
console.log('Decoded key written to decoded_key.txt');
