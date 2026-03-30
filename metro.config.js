const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver = {
	...config.resolver,
	extraNodeModules: {
		...(config.resolver?.extraNodeModules ?? {}),
		'expo-keep-awake': path.resolve(__dirname, 'src/shims/expo-keep-awake-noop.ts'),
	},
};

module.exports = config;
