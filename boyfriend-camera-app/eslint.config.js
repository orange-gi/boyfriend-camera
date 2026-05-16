const { FlatCompat } = require('@eslint/eslintrc')

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

module.exports = [
  ...compat.extends('expo'),
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-unresolved': 'off',
    },
  },
]
