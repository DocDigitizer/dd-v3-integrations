const { getClient } = require("./lib/sdk");

const test = async (z, bundle) => {
  const client = await getClient({
    apiKey: bundle.authData.apiKey,
    baseUrl: bundle.authData.baseUrl || undefined,
  });
  const message = await client.healthCheck();
  return { message };
};

module.exports = {
  type: "custom",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "string",
      required: true,
      helpText: "Your DocDigitizer API key",
    },
    {
      key: "baseUrl",
      label: "Base URL",
      type: "string",
      required: false,
      default: "https://apix.docdigitizer.com/sync",
      helpText: "API base URL (change only for self-hosted instances)",
    },
  ],
  test,
  connectionLabel: "DocDigitizer ({{bundle.authData.apiKey}})",
};
