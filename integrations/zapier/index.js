const authentication = require("./authentication");
const processDocument = require("./creates/process_document");
const healthCheck = require("./searches/health_check");

module.exports = {
  version: require("./package.json").version,
  platformVersion: require("zapier-platform-core").version,
  authentication,
  creates: {
    [processDocument.key]: processDocument,
  },
  searches: {
    [healthCheck.key]: healthCheck,
  },
};
