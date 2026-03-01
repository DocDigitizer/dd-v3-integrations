let _DocDigitizer;

async function getClient(config) {
  if (!_DocDigitizer) {
    const mod = await import("docdigitizer");
    _DocDigitizer = mod.DocDigitizer;
  }
  return new _DocDigitizer(config);
}

module.exports = { getClient };
