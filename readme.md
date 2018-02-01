# Ctrlpanel Web Extension

Browser extension for loging in to websites using your [Ctrlpanel](https://www.ctrlpanel.io/) account.

- [Chrome](https://chrome.google.com/webstore/detail/ctrlpanel/nmjefmjehgomhbhpecnalkejcamiomdo)
- Edge *(awaiting PBKDF2 Web Crypto API)*
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/ctrlpanel/)
- [Opera](https://addons.opera.com/en-gb/extensions/details/ctrlpanel/) *(pending review)*
- Safari *(pending review)*

## Building the extension

The following commands should output the final web extension in a folder called `distribution`:

```sh
npm install
npm run build:production
```

## Hacking

To work on the extension, use the following command to launch a FireFox instance that will reload the extension whenever any source files are changed.

```sh
npm run dev:firefox
```

## Releasing

The following command will output a `.zip` file in the `web-ext-artifacts` folder, ready for uploading to [Mozilla Addons](https://addons.mozilla.org/).

```sh
npm run release
```
