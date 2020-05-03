import path from 'path';
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: path.join('lib', pkg.main),
            format: 'cjs',
        },
        {
            file: path.join('lib', pkg.module),
            format: 'esm',
        },
    ],
    plugins: [
        typescript({
            exclude: ['**/*.test.ts', '**/*.test.d.ts'],
        }),
    ],
};
