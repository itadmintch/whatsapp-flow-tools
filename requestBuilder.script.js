const crypto = require('crypto');
require('dotenv').config();

const PASSPHRASE = process.env.RSA_PASSPHRASE;
const PRIVATE_KEY = process.env.RSA_PRIVATE_KEY;

const payload = {
  version: '3.0',
  action: 'data_exchange',
  screen: 'ADMISSION',
  data: {
    trigger: 'klinik_selected',
    klinik: 'Anak-Imunisasi Anak'
  },
  flow_token: 'test-flow-token'
};

const privateKey = crypto.createPrivateKey({ key: PRIVATE_KEY, passphrase: PASSPHRASE });
const publicKey = crypto.createPublicKey(privateKey);

const aesKey = crypto.randomBytes(16);
const iv = crypto.randomBytes(16);

const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, iv);
const encryptedBody = Buffer.concat([
  cipher.update(JSON.stringify(payload), 'utf-8'),
  cipher.final(),
  cipher.getAuthTag()
]);

const encryptedAesKey = crypto.publicEncrypt(
  { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
  aesKey
);

const body = {
  encrypted_flow_data: encryptedBody.toString('base64'),
  encrypted_aes_key: encryptedAesKey.toString('base64'),
  initial_vector: iv.toString('base64')
};

console.log(JSON.stringify(payload, null, 2));
console.log('---');
console.log(JSON.stringify(body, null, 2));
