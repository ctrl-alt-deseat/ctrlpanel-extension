const path = require('path')

const unwrap = require('ts-unwrap')
const utcVersion = require('utc-version')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const GenerateJsonPlugin = require('generate-json-webpack-plugin')
const RsvgWebpackPlugin = require('rsvg-webpack-plugin')

const isProduction = (unwrap(process.env.NODE_ENV) === 'production')
const targetBrowser = unwrap(process.env.TARGET_BROWSER)

const hasSvgSupport = (targetBrowser === 'firefox')

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
    path: path.join(__dirname, 'distribution', targetBrowser),
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
    (hasSvgSupport ? (
      new CopyWebpackPlugin([
        { from: `logo-${isProduction ? targetBrowser : 'dev'}-dark.svg`, context: 'assets', to: 'logo-dark.svg' },
        { from: `logo-${isProduction ? targetBrowser : 'dev'}-light.svg`, context: 'assets', to: 'logo-light.svg' }
      ])
    ) : (
      new RsvgWebpackPlugin([
        { file: `assets/logo-${isProduction ? targetBrowser : 'dev'}-dark.svg`, name: 'logo-dark-16.png', width: 16, height: 16 },
        { file: `assets/logo-${isProduction ? targetBrowser : 'dev'}-dark.svg`, name: 'logo-dark-32.png', width: 32, height: 32 },
        { file: `assets/logo-${isProduction ? targetBrowser : 'dev'}-dark.svg`, name: 'logo-dark-48.png', width: 48, height: 48 },
        { file: `assets/logo-${isProduction ? targetBrowser : 'dev'}-dark.svg`, name: 'logo-dark-64.png', width: 64, height: 64 },
        { file: `assets/logo-${isProduction ? targetBrowser : 'dev'}-dark.svg`, name: 'logo-dark-96.png', width: 96, height: 96 },
        { file: `assets/logo-${isProduction ? targetBrowser : 'dev'}-dark.svg`, name: 'logo-dark-128.png', width: 128, height: 128 },
        { file: `assets/logo-${isProduction ? targetBrowser : 'dev'}-light.svg`, name: 'logo-light-16.png', width: 16, height: 16 },
        { file: `assets/logo-${isProduction ? targetBrowser : 'dev'}-light.svg`, name: 'logo-light-32.png', width: 32, height: 32 },
        { file: `assets/logo-${isProduction ? targetBrowser : 'dev'}-light.svg`, name: 'logo-light-48.png', width: 48, height: 48 }
      ])
    )),
    new CopyWebpackPlugin([
      { from: 'popup.html', context: 'views' }
    ]),
    new GenerateJsonPlugin('manifest.json', {
      manifest_version: 2,
      name: (isProduction ? 'Ctrlpanel' : 'Ctrlpanel DEV'),
      version: utcVersion(),

      icons: {
        16: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-16.png'),
        48: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-48.png'),
        64: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-64.png'),
        96: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-96.png'),
        128: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-128.png')
      },

      applications: (targetBrowser === 'firefox' ? { gecko: { id: `{${EXT_ID}}` } } : undefined),

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
        default_icon: {
          16: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-16.png'),
          32: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-32.png'),
          48: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-48.png')
        },

        theme_icons: [
          { size: 16, dark: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-16.png'), light: (hasSvgSupport ? 'logo-light.svg' : 'logo-light-16.png') },
          { size: 32, dark: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-32.png'), light: (hasSvgSupport ? 'logo-light.svg' : 'logo-light-32.png') },
          { size: 48, dark: (hasSvgSupport ? 'logo-dark.svg' : 'logo-dark-48.png'), light: (hasSvgSupport ? 'logo-light.svg' : 'logo-light-48.png') }
        ]
      }
    })
  ]
}
