import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: '../bffv2/schema.graphql',
  documents: 'src/graphql/**/*.graphql',
  generates: {
    'src/graphql/generated.ts': {
      plugins: ['typescript'],
      config: {
        arrayInputCoercion: false,
        avoidOptionals: true,
        enumsAsTypes: true,
        immutableTypes: true,
        maybeValue: 'T | null',
        scalars: {
          ID: 'string',
        },
      },
    },
    'src/graphql/operations-generated.ts': {
      preset: 'import-types',
      presetConfig: {
        typesPath: './generated',
      },
      plugins: ['typescript-operations'],
      config: {
        arrayInputCoercion: false,
        avoidOptionals: true,
        enumsAsTypes: true,
        immutableTypes: true,
        maybeValue: 'T | null',
        preResolveTypes: false,
        scalars: {
          ID: 'string',
        },
      },
    },
  },
}

export default config
