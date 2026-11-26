# web-utils-frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

没 VITE_API_BASE_URL 的时候默认走 /api/*
```sh
VITE_API_BASE_URL=https://api.example.com npm run build
```

### 用 Docker 构建

在前端目录运行，产物会写到宿主机的 `dist/`：

```sh
VITE_API_BASE_URL=https://api.example.com docker compose run --rm build
```

默认使用已有的 `node:23` 镜像。项目声明支持 Node 22.18+（22.x）或 24.12+，如果 Node 23 遇到依赖兼容问题，可以用 `NODE_IMAGE=node:24` 覆盖镜像。

容器会把依赖装到宿主机的 `node_modules/`。首次构建、依赖文件变更或 Node 运行环境变化时会执行 `npm ci`，平时直接复用已安装的依赖。首次安装会替换已有的 `node_modules/` 内容。

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
