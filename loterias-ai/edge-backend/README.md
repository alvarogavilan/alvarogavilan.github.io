# EDGE Sentinel backend

Backend gratuito orientado a vigilancia continua de EDGE sin depender de Safari ni GitHub Actions.

## Arquitectura

- Cloudflare Worker `loterias-edge-sentinel`.
- Durable Object SQLite `EdgeSentinel` como singleton persistente.
- Alarm cada ~5 s; Cron cada minuto solo como watchdog para rearmar el alarm.
- Fuente inicial: GraphQL público de jackpots de Botemania (`jackpots`, `redTigerJackpots`, `blueprintJackpots`).
- Rechaza claves ambiguas; no intenta eludir autenticación, rate limits ni controles de acceso.
- Backoff automático hasta 60 s ante errores.
- Guarda estado actual, snapshots por minuto (90 días), snapshots horarios de largo plazo y eventos de cambio/caída.
- Evalúa el contrato científico estático de EDGE. El contrato actual está desactivado y por tanto no puede autorizar dinero real.
- Telegram solo se envía al entrar en GREEN o al salir de GREEN; requiere secretos de Cloudflare `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`.

## Endpoints

- `/health` o `/state`: estado vivo, edad, contadores, señal y último aviso.
- `/events?limit=100`: cambios y caídas detectadas.
- `/history/minute?limit=240`: snapshots recientes.
- `/history/hour?limit=720`: archivo horario.

## Despliegue desde GitHub sin GitHub Actions

Cloudflare Workers Builds puede conectarse directamente a GitHub. En Cloudflare: Workers & Pages → Create application → Import a repository → seleccionar `alvarogavilan/alvarogavilan.github.io` → root directory `loterias-ai/edge-backend` → nombre `loterias-edge-sentinel` → deploy.

Después, añadir como Secrets del Worker:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

No guardar secretos en GitHub.

## Free-plan budget

Con un alarm cada 5 s son ~17.280 invocaciones/día. El patrón usa una escritura de estado y un `setAlarm()` por ciclo, más snapshots compactos, por lo que está diseñado para quedar por debajo de los límites diarios actuales del plan gratuito de Durable Objects. Si aparecen errores o rate limits, reduce automáticamente la frecuencia mediante backoff.

## Seguridad científica

`realMoneyAllowed` permanece fail-closed. Un contador alto, un reset o un prior histórico no pueden producir GREEN. Se requiere contrato habilitado, seis verificaciones científicas positivas, stake exacto, presupuesto coherente, vigencia temporal y datos directos frescos e inequívocos.
