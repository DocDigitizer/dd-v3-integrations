import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow";
import { NodeOperationError } from "n8n-workflow";
import { DocDigitizer } from "docdigitizer";

export class DocDigitizerNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: "DocDigitizer",
    name: "docDigitizer",
    icon: "file:docdigitizer.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Process documents with DocDigitizer — OCR, classification, and data extraction",
    defaults: {
      name: "DocDigitizer",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "docDigitizerApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Document",
            value: "document",
          },
          {
            name: "Health",
            value: "health",
          },
        ],
        default: "document",
      },
      // Document → Process
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["document"],
          },
        },
        options: [
          {
            name: "Process",
            value: "process",
            description: "Upload and process a PDF document",
            action: "Process a document",
          },
        ],
        default: "process",
      },
      // Health → Check
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["health"],
          },
        },
        options: [
          {
            name: "Check",
            value: "check",
            description: "Check if the API is healthy",
            action: "Check API health",
          },
        ],
        default: "check",
      },
      // Document → Process: fields
      {
        displayName: "Binary Property",
        name: "binaryPropertyName",
        type: "string",
        default: "data",
        required: true,
        displayOptions: {
          show: {
            resource: ["document"],
            operation: ["process"],
          },
        },
        description: "Name of the binary property containing the PDF file",
      },
      {
        displayName: "Pipeline",
        name: "pipeline",
        type: "string",
        default: "",
        displayOptions: {
          show: {
            resource: ["document"],
            operation: ["process"],
          },
        },
        description: "Pipeline name to use for processing (optional)",
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials("docDigitizerApi");
    const client = new DocDigitizer({
      apiKey: credentials.apiKey as string,
      baseUrl: (credentials.baseUrl as string) || undefined,
    });

    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        if (resource === "document" && operation === "process") {
          const binaryPropertyName = this.getNodeParameter(
            "binaryPropertyName",
            i,
          ) as string;
          const pipeline = this.getNodeParameter("pipeline", i, "") as string;

          const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
          const buffer = await this.helpers.getBinaryDataBuffer(
            i,
            binaryPropertyName,
          );

          const response = await client.process({
            fileContent: Buffer.from(buffer),
            fileName: binaryData.fileName ?? "document.pdf",
            pipelineIdentifier: pipeline || undefined,
          });

          const extractions = (response.output?.extractions ?? []).map((ext) => ({
            documentType: ext.documentType,
            confidence: ext.confidence,
            countryCode: ext.countryCode,
            pages: ext.pages,
            pageRange: ext.pageRange,
            extraction: ext.extraction,
            schema: ext.schema,
          }));

          returnData.push({
            json: {
              state: response.state,
              traceId: response.traceId,
              pipeline: response.pipeline,
              numPages: response.numPages,
              extractions,
            },
          });
        } else if (resource === "health" && operation === "check") {
          const message = await client.healthCheck();
          returnData.push({
            json: {
              status: "alive",
              message,
            },
          });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error as Error, {
          itemIndex: i,
        });
      }
    }

    return [returnData];
  }
}
