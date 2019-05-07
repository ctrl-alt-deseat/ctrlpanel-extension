# eego web extension

Browser extension for loging in to websites using your [eego](https://www.eego.app/) account.

- Chrome *(pending submission)*
- Edge *(awaiting PBKDF2 Web Crypto API)*
- Firefox *(pending submission)*
- Safari *(pending development)*

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
