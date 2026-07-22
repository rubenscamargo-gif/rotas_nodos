'use client';

import { useEffect, useState } from 'react';

type Rota = {
  facility_id: string;
  cycle: string;
  route_id: string;
  route_name: string;
  Roteiro_Plan: string;
  ORD_NOMBRE_FILTRADO: string;
  FACILITY_ORIGEN: string;
  prefixo: string;
  Multinivel: string;
  travel_time: number;
  travel_distance: number;
  volumen_occupancy: number;
  SHP_MEL_SERVICE_ID: number;
  agendado: boolean;
  spr: number;
  stop_sequence: number;
  action_type: string;
  unit_id: string;
  unit_type: string;
};

const cols = ['Rota', 'Prefixo', 'Cycle', 'Multinível', 'Stop', 'Action', 'Unit ID', 'Unit Type', 'SPR', 'Agendado', 'Origem'];

export default function Home() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/rotas')
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setRotas(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>Dashboard Last Mile</h1>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>SSP52 · CHP_SLW · 2026-07-22 · 10 rotas</p>

      {loading && <p style={{ color: '#555' }}>Carregando dados do BigQuery...</p>}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '12px', color: '#b91c1c', fontSize: '13px' }}>
          <strong>Erro:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: 'auto', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#FFDB00' }}>
                {cols.map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rotas.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 14px', fontWeight: '500' }}>{r.route_name}</td>
                  <td style={{ padding: '8px 14px', color: '#444' }}>{r.prefixo}</td>
                  <td style={{ padding: '8px 14px', color: '#444' }}>{r.cycle}</td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: r.Multinivel === 'Sim' ? '#dbeafe' : '#f3f4f6', color: r.Multinivel === 'Sim' ? '#1d4ed8' : '#555' }}>
                      {r.Multinivel}
                    </span>
                  </td>
                  <td style={{ padding: '8px 14px', color: '#444' }}>{r.stop_sequence}</td>
                  <td style={{ padding: '8px 14px', color: '#444' }}>{r.action_type}</td>
                  <td style={{ padding: '8px 14px', color: '#444' }}>{r.unit_id}</td>
                  <td style={{ padding: '8px 14px', color: '#444' }}>{r.unit_type}</td>
                  <td style={{ padding: '8px 14px', color: '#444' }}>{r.spr}</td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: r.agendado ? '#dcfce7' : '#f3f4f6', color: r.agendado ? '#15803d' : '#555' }}>
                      {r.agendado ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 14px', color: '#444' }}>{r.FACILITY_ORIGEN}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
