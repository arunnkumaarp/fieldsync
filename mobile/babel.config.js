module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // WatermelonDB's Model classes use legacy-style decorators (@field, @date,
  // @children, ...) — this plugin must run before any other decorator
  // handling in the RN preset.
  plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
};
