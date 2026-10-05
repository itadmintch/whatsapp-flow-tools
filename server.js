const http = require('http');
const { processFlowRequest, getCryptoDiagnostics } = require('./hospital booking/booking');
const axios = require('axios');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(payload);
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
}

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function stringifyForLog(value, maxLength = 4000) {
  if (value == null) return '';

  let content;
  try {
    content = typeof value === 'string' ? value : JSON.stringify(value);
  } catch (error) {
    content = '[unserializable body]';
  }

  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength)}... [truncated]`;
}

function attachRequestLogger(req, res) {
  const requestId = createRequestId();
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const ip = req.socket?.remoteAddress || 'unknown';
    const bodyLog = req.bodyForLog ? ` body=${req.bodyForLog}` : '';
    console.log(
      `[${requestId}] ${req.method} ${req.url} -> ${res.statusCode} ${elapsedMs.toFixed(2)}ms ip=${ip}${bodyLog}`
    );
  });
}

const server = http.createServer(async (req, res) => {
  attachRequestLogger(req, res);

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (req.method === 'GET' && req.url === '/health/crypto') {
    const diagnostics = getCryptoDiagnostics();
    const statusCode = diagnostics.keyLoadable ? 200 : 500;
    sendJson(res, statusCode, {
      status: diagnostics.keyLoadable ? 'ok' : 'error',
      diagnostics
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/webhook') {
    try {
      const body = await collectBody(req);
      req.bodyForLog = stringifyForLog(body);
      const result = await processFlowRequest(body);

      const statusCode = Number(result?.code) || 200;
      sendJson(res, statusCode, result);
    } catch (error) {
      console.error('Request handling error:', error);
      sendJson(res, 400, {
        code: 400,
        message: error.message || 'Bad Request'
      });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/webhook/encrypted') {
    try {
      const body = await collectBody(req);
      req.bodyForLog = stringifyForLog(body);
      const result = await processFlowRequest(body);

      if (result?.response && typeof result.response === 'string') {
        sendText(res, 200, result.response);
        return;
      }

      const statusCode = Number(result?.code) || 500;
      sendJson(res, statusCode, result);
    } catch (error) {
      console.error('Request handling error:', error);
      sendJson(res, 400, {
        code: 400,
        message: error.message || 'Bad Request'
      });
    }
    return;
  }

  // Iris API Call Testing
  if (req.method === 'POST' && req.url === '/iris/test') {
    try {
      console.log('Fetching from Iris API...');
      const irisResponse = await axios.post(
        process.env.NODE_ENV === 'production'
          ? 'http://sp-testing-toolkit-api-enkcbf:3000/sp/fetch/BASE'
          : 'http://tchirisapi.tzuchihospital.co.id/sp/fetch/BASE',
        {
          className: 'Custom.IDTC.Reports.StoredProc.Qontak.FlowSession',
          methodName: 'GetSessionByDate',
          args: ['80000131', '2026-10-13']
        },
        {
          timeout: 5000 // 5 seconds timeout
        }
      );

      console.log('Test Fetched Iris API:', irisResponse.data);
      sendJson(res, 200, {
        data: irisResponse.data.result || []
      });
    } catch (error) {
      console.error('Failed to fetch klinik from Iris API:', error);
      sendJson(res, 500, {
        status: 'error',
        message: 'Failed to fetch klinik from Iris API: ' + error.message
      });
    } finally {
      return;
    }
  }

  sendJson(res, 404, {
    code: 404,
    message: 'Not Found'
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
  console.log('POST /webhook to process WhatsApp Flow payloads');
  console.log('POST /webhook/encrypted to return only encrypted response text');
  console.log('GET /health/crypto to validate private key and fingerprint');
});
