const path = require('path')

const utcVersion = require('utc-version')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const GenerateJsonPlugin = require('generate-json-webpack-plugin')

const isProduction = (process.env.NODE_ENV === 'production')

const API_HOST = (isProduction ? 'https://api.ctrlpanel.io' : 'http://localhost:1834')
const APP_HOST = (isProduction ? 'https://app.ctrlpanel.io' : 'http://localhost:1836')
const AUTO_SUBMIT = (isProduction)
const EXT_ID = (isProduction ? '4b209421-a51b-4556-88f1-a712a978cdd1' : '5ad8f361-be47-444c-b939-b2aa17f11cf2')

module.exports = {
  entry: {
    filler: './source/filler.ts',
    popup: './source/popup.ts'
  },
  output: {
    path: path.join(__dirname, 'distribution'),
    filename: '[name].js'
  },
  node: {
    // Enabled
    global: true,

    // Misc
    console: false,
    process: false,
    Buffer: false,

    // Modules
    assert: false,
    async_hooks: false,
    buffer: false,
    child_process: false,
    cluster: false,
    constants: false,
    crypto: false,
    dgram: false,
    dns: false,
    domain: false,
    events: false,
    fs: false,
    http: false,
    http2: false,
    https: false,
    inspector: false,
    module: false,
    net: false,
    os: false,
    path: false,
    perf_hooks: false,
    punycode: false,
    querystring: false,
    readline: false,
    repl: false,
    stream: false,
    string_decoder: false,
    timers: false,
    tls: false,
    tty: false,
    url: false,
    util: false,
    v8: false,
    vm: false,
    zlib: false
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader', options: { compilerOptions: { noEmit: false } } }
    ]
  },
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.DefinePlugin({
      'process.env.API_HOST': JSON.stringify(API_HOST),
      'process.env.APP_HOST': JSON.stringify(APP_HOST),
      'process.env.AUTO_SUBMIT': JSON.stringify(AUTO_SUBMIT),
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
    }),
    new CopyWebpackPlugin([
      { from: '*', context: 'assets' },
      { from: '*', context: 'views' }
    ]),
    new GenerateJsonPlugin('manifest.json', {
      manifest_version: 2,
      name: (isProduction ? 'Ctrlpanel' : 'Ctrlpanel DEV'),
      version: utcVersion(),

      applications: {
        gecko: {
          id: `{${EXT_ID}}`
        }
      },

      description: 'One-click sign in for accounts in Ctrlpanel.io',
      homepage_url: 'https://www.ctrlpanel.io/',

      permissions: [
        'activeTab',
        `${API_HOST.replace(/:\d+$/, '')}/*`,
        `${APP_HOST.replace(/:\d+$/, '')}/*`
      ],

      browser_action: {
        default_title: 'Ctrlpanel',
        default_popup: 'popup.html',
        default_icon: `logo-${isProduction ? 'firefox' : 'dev'}-dark.svg`,

        theme_icons: [
          {
            dark: `logo-${isProduction ? 'firefox' : 'dev'}-dark.svg`,
            light: `logo-${isProduction ? 'firefox' : 'dev'}-light.svg`,
            size: 16
          },
          {
            dark: `logo-${isProduction ? 'firefox' : 'dev'}-dark.svg`,
            light: `logo-${isProduction ? 'firefox' : 'dev'}-light.svg`,
            size: 32
          }
        ]
      }
    })
  ]
}
