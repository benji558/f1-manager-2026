// ChampionshipTable — Sortable driver or constructor standings
import { useState } from 'react';

export default function ChampionshipTable({ rows = [], type = 'driver' }) {
  const isDriver = type === 'driver';

  return (
    <div className="standings-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="col-pos">Pos</th>
            {isDriver ? (
              <>
                <th>Driver</th>
                <th>Team</th>
              </>
            ) : (
              <th>Constructor</th>
            )}
            <th className="col-pts">Pts</th>
            <th style={{ width: 60 }}>Wins</th>
            {isDriver && <th style={{ width: 80 }}>Podiums</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isPlayer = row.isPlayer;
            const gap = i === 0 ? '—' : `-${(rows[0].points - row.points)}`;
            return (
              <tr key={row.driverId ?? row.teamId} className={isPlayer ? 'row-player' : ''}>
                <td className="col-pos">
                  <span style={{ color: i < 3 ? ['#FFD700','#C0C0C0','#CD7F32'][i] : undefined }}>
                    {row.rank}
                  </span>
                </td>
                {isDriver ? (
                  <>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div
                          className="team-stripe"
                          style={{ background: row.teamColor, minHeight: 20 }}
                        />
                        <div>
                          <div className="text-white text-bold text-sm">{row.name ?? row.driverId}</div>
                          {isPlayer && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>YOU</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-muted text-sm">{row.teamId?.replace('_', ' ')}</span>
                    </td>
                  </>
                ) : (
                  <td>
                    <div className="flex items-center gap-sm">
                      <div
                        className="team-dot"
                        style={{ background: row.color }}
                      />
                      <span className="text-white text-sm">{row.teamId?.replace('_', ' ')}</span>
                      {isPlayer && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>YOU</span>}
                    </div>
                  </td>
                )}
                <td className="col-pts">
                  <span className={i === 0 ? 'points-leader' : ''}>{row.points}</span>
                </td>
                <td className="text-sm text-muted">{row.wins}</td>
                {isDriver && <td className="text-sm text-muted">{row.podiums}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
