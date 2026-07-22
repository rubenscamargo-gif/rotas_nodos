import { BigQuery } from '@google-cloud/bigquery';
import { NextResponse } from 'next/server';

const bigquery = new BigQuery({ projectId: 'meli-bi-data' });

const query = `
WITH Params AS (
  SELECT
    'SSP52' AS facility_id,
    'CHP_SLW' AS cycle,
    DATE '2026-07-22' AS ope_date,
    DATETIME_SUB(CAST(DATE '2026-07-22' AS DATETIME), INTERVAL 3 DAY) AS perf_date,
    DATETIME_SUB(CAST(DATE '2026-07-22' AS DATETIME), INTERVAL 10 DAY) AS order_filter_start_date,
    DATETIME_ADD(CAST(DATE '2026-07-22' AS DATETIME), INTERVAL 2 DAY) AS order_filter_end_date
),

FilteredOrderData AS (
  SELECT
    ord.ORD_ORDER_ID, ord.ORD_NOMBRE, ord.ORD_CONFIGURACION,
    ROW_NUMBER() OVER(PARTITION BY ord.ORD_ORDER_ID ORDER BY ord.SHP_LG_PLANIFICATION_DATE_DTTM DESC) as rn
  FROM \`meli-bi-data.WHOWNER.BT_SHP_LG_ROUTING_ORDER\` ord
  CROSS JOIN Params
  WHERE ord.SHP_FACILITY_ID = Params.facility_id
    AND ord.SHP_LG_PLANIFICATION_DATE_DTTM >= Params.order_filter_start_date
    AND ord.SHP_LG_PLANIFICATION_DATE_DTTM < Params.order_filter_end_date
    AND LOWER(COALESCE(ord.ORD_NOMBRE, '')) NOT LIKE '%onda extra%'
),

ValidRoutes AS (
  SELECT
    r.RTG_ROUTE_UUID, r.SHP_FACILITY_ID as facility_id, r.SHP_CYCLE, r.RTG_ROUTE_ID as route_id,
    r.RTG_ROUTE_NAME as route_name,
    ord_data.ORD_ORDER_ID as Roteiro_Plan,
    r.RTG_ROUTE_SUMMARIES, r.SHP_LG_VEHICLE_TYPE_ID,
    r.RTG_ROUTE_ORIGIN,
    r.SHP_MEL_SERVICE_ID,
    CAST(JSON_VALUE(r.RTG_ROUTE_METADATA, '$.service.scheduled') AS BOOL) as agendado,
    ord_data.ORD_NOMBRE as nombre, ord_data.ORD_CONFIGURACION as configuracion
  FROM \`meli-bi-data.WHOWNER.BT_SHP_LG_RTG_ROUTE\` r
  CROSS JOIN Params
  LEFT JOIN FilteredOrderData ord_data ON r.ORD_ORDER_ID = ord_data.ORD_ORDER_ID AND ord_data.rn = 1
  WHERE r.SIT_SITE_ID = 'MLB'
    AND r.SHP_FACILITY_ID = Params.facility_id
    AND r.RTG_ROUTE_DEPARTURE_DTTM >= CAST(Params.ope_date AS DATETIME)
    AND r.RTG_ROUTE_DEPARTURE_DTTM < DATETIME_ADD(CAST(Params.ope_date AS DATETIME), INTERVAL 1 DAY)
    AND r.SHP_CYCLE.name = Params.cycle
    AND r.RTG_ROUTE_STATUS = 'planned'
)

SELECT
  vr.facility_id,
  vr.SHP_CYCLE.name as cycle,
  vr.route_id,
  vr.route_name,
  vr.Roteiro_Plan,
  vr.nombre as ORD_NOMBRE_FILTRADO,
  vr.RTG_ROUTE_ORIGIN.SHP_FACILITY_ID as FACILITY_ORIGEN,
  REGEXP_EXTRACT(vr.route_name, r'^([^_]+)') as prefixo,
  CASE WHEN (LENGTH(vr.route_name) - LENGTH(REPLACE(vr.route_name, '_', ''))) > 1 THEN 'Sim' ELSE 'Não' END AS Multinivel,
  vr.RTG_ROUTE_SUMMARIES.TRAVEL_TIME as travel_time,
  vr.RTG_ROUTE_SUMMARIES.TRAVEL_DISTANCE as travel_distance,
  vr.RTG_ROUTE_SUMMARIES.VOLUME_OCCUPANCY as volumen_occupancy,
  vr.SHP_MEL_SERVICE_ID,
  vr.agendado,
  vr.RTG_ROUTE_SUMMARIES.UNITS as spr,
  s.RTG_STOP_SEQUENCE as stop_sequence,
  sa.RTG_ACTION_OPERATION_TYPE as action_type,
  sau.RTG_UNIT_EXTERNAL_ID as unit_id,
  sau.RTG_UNIT_EXTERNAL_TYPE as unit_type
FROM ValidRoutes vr
CROSS JOIN Params
INNER JOIN \`meli-bi-data.WHOWNER.BT_SHP_LG_RTG_STOP\` s ON s.RTG_ROUTE_UUID = vr.RTG_ROUTE_UUID AND s.RTG_STOP_LAST_UPDATED_DTTM >= Params.perf_date
INNER JOIN \`meli-bi-data.WHOWNER.BT_SHP_LG_RTG_STOP_ACTION\` sa ON sa.RTG_STOP_UUID = s.RTG_STOP_UUID AND sa.RTG_ACTION_LAST_UPDATED_DTTM >= Params.perf_date
INNER JOIN \`meli-bi-data.WHOWNER.BT_SHP_LG_RTG_STOP_ACTION_UNIT\` sau ON sau.RTG_ACTION_UUID = sa.RTG_ACTION_UUID AND sau.RTG_ACTION_LAST_UPDATED_DTTM >= Params.perf_date
ORDER BY route_name, stop_sequence
LIMIT 10
`;

export async function GET() {
  try {
    const [rows] = await bigquery.query({ query, location: 'US' });
    return NextResponse.json({ data: rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
