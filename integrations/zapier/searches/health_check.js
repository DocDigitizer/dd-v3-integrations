const { DocDigitizer } = require("docdigitizer");

const perform = async (z, bundle) => {
  const client = new DocDigitizer({
    apiKey: bundle.authData.apiKey,
    baseUrl: bundle.authData.baseUrl || undefined,
  });

  const message = await client.healthCheck();
  return [{ status: "alive", message }];
};

module.exports = {
  key: "health_check",
  noun: "Health",
  display: {
    label: "Health Check",
    description: "Check if the DocDigitizer API is healthy and responsive.",
    hidden: true,
  },
  operation: {
    inputFields: [],
    perform,
    sample: {
      status: "alive",
      message: "I am alive",
    },
    outputFields: [
      { key: "status", label: "Status" },
      { key: "message", label: "Message" },
    ],
  },
};
