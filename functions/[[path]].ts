export async function onRequest(context: any) {
  const { default: handler } = await import('../dist/server/index.js')
  return handler.fetch(context.request, context.env, context)
}
