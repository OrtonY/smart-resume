export default {
  build: {
    rollupOptions: {
      input: {
        popup: 'popup.html',
        'content-script': 'src/contentScript.ts',
        'service-worker': 'src/serviceWorker.ts',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
}
