// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Restrict Metro to only watch the mobile-app directory
// This prevents it from hoisting modules from parent monorepo
config.watchFolders = [__dirname];

// Ensure Metro resolves modules from mobile-app's node_modules first
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Configure Metro to handle ES modules from Firebase
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'mjs');

module.exports = config;
