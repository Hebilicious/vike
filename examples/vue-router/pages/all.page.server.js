import { renderToString } from '@vue/server-renderer'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import { createApp } from './app'

export { render }

async function render(pageContext) {
  const { Page } = pageContext
  const { app, router } = createApp({ Page })

  // set the router to the desired URL before rendering
  router.push(pageContext.urlOriginal)
  await router.isReady()

  const appHtml = await renderToString(app)

  return escapeInject`<!DOCTYPE html>
    <html>
      <body>
        <div id="app">${dangerouslySkipEscape(appHtml)}</div>
      </body>
    </html>`
}
