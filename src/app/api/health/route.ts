// Проверка, что сервер жив: для хостинга и планировщика, который не даёт сайту заснуть
// (docs/09-deploy.md). В базу не ходит — иначе каждые 5 минут будил бы и её.
export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
