import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import monacoEditorPluginPkg from 'vite-plugin-monaco-editor'

const monacoEditorPlugin = monacoEditorPluginPkg.default ?? monacoEditorPluginPkg

export default defineConfig({
  plugins: [
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'css', 'html', 'json', 'typescript'],
    }),
    svelte(),
  ],
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
})
