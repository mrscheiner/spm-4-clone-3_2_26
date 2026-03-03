const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude backend folder from Metro bundling completely
const backendPath = path.resolve(__dirname, 'backend');
config.resolver.blockList = [
  new RegExp(`^${backendPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/.*$`),
];

// Also exclude backend from watchFolders
config.watchFolders = config.watchFolders?.filter(f => !f.includes('backend')) || [];

// Fix for RN 0.81 - redirect missing inspector modules to empty stubs
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Block internal RN inspector modules that were removed/moved in RN 0.81
  if (moduleName.includes('react-native/src/private/inspector/')) {
    return {
      type: 'empty',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withRorkMetro(config);
