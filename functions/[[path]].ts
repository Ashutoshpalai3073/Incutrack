export async function onRequest(context: any) {
  const { default: handler } = await import('../dist/serve/server.js')
  return handler.fetch(context.request, context.env, context)
}
