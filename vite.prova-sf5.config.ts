import { mergeConfig } from 'vite';
import base from './vite.config';
export default mergeConfig(base, { cacheDir: 'node_modules/.vite-sf5', resolve: { dedupe: ['react', 'react-dom', 'scheduler'] } });
