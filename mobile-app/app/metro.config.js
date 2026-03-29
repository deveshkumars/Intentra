const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../');

const config = getDefaultConfig(projectRoot);

// Allow Metro to see files outside the app root (shared/)
config.watchFolders = [monorepoRoot];

// Resolve modules from app's node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
