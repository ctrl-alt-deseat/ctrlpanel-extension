const fs = require('fs')
const path = require('path')

const restrictNodeStuff = require('webpack-restrict-node-stuff')
const unwrap = require('ts-unwrap')
const utcVersion = require('utc-version')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WriteWebpackPlugin = require('write-webpack-plugin')

const WextIcons = require('@wext/icons')
const WextManifest = require('@wext/manifest')

const isProduction = (unwrap(process.env.NODE_ENV) === 'production')
const targetBrowser = unwrap(process.env.TARGET_BROWSER)

const API_HOST = (isProduction ? 'https://api.ctrlpanel.io' : 'http://localhost:1834')
const APP_HOST = (isProduction ? 'https://app.ctrlpanel.io' : 'http://localhost:1836')
const AUTO_SUBMIT = (isProduction)
const EXT_ID = (isProduction ? '4b209421-a51b-4556-88f1-a712a978cdd1' : '5ad8f361-be47-444c-b939-b2aa17f11cf2')
const BUNDLE_ID = (isProduction ? 'com.ctrlaltdeseat.ctrlpanel' : 'com.ctrlaltdeseat.ctrlpanel-dev')
const DEVELOPER_ID = '3J63SJ6WJU'

const iconSource = fs.readFileSync(`assets/logo${isProduction ? '' : '-dev'}.svg`)
const actionIcon = WextIcons.action(iconSource, targetBrowser)
const extensionIcon = WextIcons.extension(iconSource, targetBrowser, { shape: 'circle' })

const manifest = WextManifest[targetBrowser]({
  manifest_version: 2,
  name: (isProduction ? 'Ctrlpanel' : 'Ctrlpanel DEV'),
  version: utcVersion({ apple: (targetBrowser === 'safari') }),
  icons: extensionIcon.spec,

  applications: {
    gecko: { id: `{${EXT_ID}}` },
    safari: { id: BUNDLE_ID, developer_id: DEVELOPER_ID, popup_width: 256, popup_height: 83 }
  },

  author: 'Ctrl Alt Deseat AB',
  description: 'One-click sign in for accounts in Ctrlpanel.io',
  homepage_url: 'https://www.ctrlpanel.io/',

  permissions: (targetBrowser === 'safari' ? [
    '<all_urls>'
  ] : [
    'activeTab',
    `${API_HOST.replace(/:\d+$/, '')}/*`,
    `${APP_HOST.replace(/:\d+$/, '')}/*`
  ]),

  background: {
    page: 'global.html'
  },

  browser_action: {
    default_title: 'Ctrlpanel',
    default_popup: 'popup.html',
    default_icon: actionIcon.spec
  },

  content_scripts: [{
    matches: [(targetBrowser === 'safari' ? '*://*/*' : `${APP_HOST.replace(/:\d+$/, '')}/*`)],
    run_at: 'document_start',
    js: ['content.js']
  }]
})

module.exports = {
  entry: {
    content: './source/content.ts',
    filler: './source/filler.ts',
    global: './source/global.ts',
    popup: './source/popup.ts'
  },
  output: {
    path: path.join(__dirname, 'distribution', (targetBrowser === 'safari' ? 'safari.safariextension' : targetBrowser)),
    filename: '[name].js'
  },
  node: restrictNodeStuff(['global']),
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
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      'process.env.TARGET_BROWSER': JSON.stringify(targetBrowser)
    }),
    new WriteWebpackPlugin([
      ...extensionIcon.files,
      ...actionIcon.files,
      { name: manifest.name, data: Buffer.from(manifest.content) }
    ]),
    new CopyWebpackPlugin([
      { from: 'spinner.svg', context: 'assets' },
      { from: 'global.html', context: 'views' },
      { from: 'popup.html', context: 'views' }
    ])
  ]
}
