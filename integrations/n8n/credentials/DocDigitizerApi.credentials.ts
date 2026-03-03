import type {
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class DocDigitizerApi implements ICredentialType {
  name = "docDigitizerApi";
  displayName = "DocDigitizer API";
  documentationUrl = "https://github.com/DocDigitizer/dd-v3-integrations/tree/main/integrations/n8n";

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description: "Your DocDigitizer API key",
    },
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://api.docdigitizer.com/v3/docingester",
      description: "API base URL (change only for self-hosted instances)",
    },
  ];
}
