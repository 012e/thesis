import { mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config';

export default mergeConfig(baseConfig, {
  test: {
    fileParallelism: false,
    hookTimeout: 120000,
    testTimeout: 20000,
  },
});
