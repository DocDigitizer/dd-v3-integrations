const { getClient } = require("../lib/sdk");

const perform = async (z, bundle) => {
  const client = await getClient({
    apiKey: bundle.authData.apiKey,
    baseUrl: bundle.authData.baseUrl || undefined,
  });

  // Download the file from the URL that Zapier provides
  const fileResponse = await z.request({
    url: bundle.inputData.file,
    raw: true,
  });
  const buffer = Buffer.from(await fileResponse.buffer());

  // Extract filename from URL or use default
  const urlPath = new URL(bundle.inputData.file).pathname;
  const fileName =
    urlPath.split("/").pop() || bundle.inputData.fileName || "document.pdf";

  const response = await client.process({
    fileContent: buffer,
    fileName,
    pipelineIdentifier: bundle.inputData.pipeline || undefined,
  });

  const extractions = (response.output?.extractions ?? []).map((ext) => ({
    documentType: ext.documentType,
    confidence: ext.confidence,
    countryCode: ext.countryCode,
    pages: ext.pages,
    extraction: ext.extraction,
  }));

  return {
    state: response.state,
    traceId: response.traceId,
    pipeline: response.pipeline,
    numPages: response.numPages,
    extractions,
  };
};

module.exports = {
  key: "process_document",
  noun: "Document",
  display: {
    label: "Process Document",
    description:
      "Upload and process a PDF document with DocDigitizer — returns document type, confidence, and extracted data.",
  },
  operation: {
    inputFields: [
      {
        key: "file",
        label: "File",
        type: "file",
        required: true,
        helpText: "The PDF file to process",
      },
      {
        key: "fileName",
        label: "File Name",
        type: "string",
        required: false,
        helpText: "Override the file name (optional)",
      },
      {
        key: "pipeline",
        label: "Pipeline",
        type: "string",
        required: false,
        helpText: "Pipeline name to use for processing (optional)",
      },
    ],
    perform,
    sample: {
      state: "COMPLETED",
      traceId: "abc-123-def-456",
      numPages: 2,
      extractions: [
        {
          documentType: "Invoice",
          confidence: 0.95,
          countryCode: "PT",
          pages: [1, 2],
          extraction: {
            invoiceNumber: "INV-001",
            totalAmount: 1500.0,
            currency: "EUR",
          },
        },
      ],
    },
    outputFields: [
      { key: "state", label: "State" },
      { key: "traceId", label: "Trace ID" },
      { key: "numPages", label: "Number of Pages", type: "integer" },
      { key: "extractions[]documentType", label: "Document Type" },
      { key: "extractions[]confidence", label: "Confidence", type: "number" },
      { key: "extractions[]countryCode", label: "Country Code" },
    ],
  },
};
