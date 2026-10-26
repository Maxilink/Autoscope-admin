import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { Empty } from './ui.jsx';
import { cx } from '../lib/format.js';

/**
 * columns: [{ key, header, render?(row), sort?(row) => value, align?: 'right', width? }]
 * selection: optional { selected: Set, onChange(Set), isSelectable?(row) }
 */
export default function DataTable({ columns, rows, onRowClick, activeId, pageSize = 12, empty, selection, initialSort }) {
  const [sort, setSort] = useState(initialSort || null); // { key, dir }
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [rows.length]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const out = [...rows].sort((a, b) => {
      const x = col.sort(a);
      const y = col.sort(b);
      return x < y ? -1 : x > y ? 1 : 0;
    });
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (key) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  const selectable = selection ? visible.filter((r) => selection.isSelectable?.(r) ?? true) : [];
  const allChecked = selectable.length > 0 && selectable.every((r) => selection.selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selection.selected);
    selectable.forEach((r) => (allChecked ? next.delete(r.id) : next.add(r.id)));
    selection.onChange(next);
  };
  const toggleOne = (id) => {
    const next = new Set(selection.selected);
    next.has(id) ? next.delete(id) : next.add(id);
    selection.onChange(next);
  };

  if (!rows.length) return <Empty title={empty?.title || 'Nothing here'}>{empty?.body}</Empty>;

  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {selection && (
                <th className="table__check">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all on this page" disabled={!selectable.length} />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} style={{ width: c.width }} className={cx(c.align === 'right' && 'is-right')} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sort ? (
                    <button type="button" className="table__sort" onClick={() => toggleSort(c.key)}>
                      {c.header}
                      {sort?.key === c.key && <Icon name={sort.dir === 'asc' ? 'arrowUp' : 'arrowDown'} size={13} />}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className={cx(onRowClick && 'is-clickable', activeId === row.id && 'is-active')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {selection && (
                  <td className="table__check" onClick={(e) => e.stopPropagation()}>
                    {(selection.isSelectable?.(row) ?? true) && (
                      <input type="checkbox" checked={selection.selected.has(row.id)} onChange={() => toggleOne(row.id)} aria-label={`Select ${row.id}`} />
                    )}
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={cx(c.align === 'right' && 'is-right')}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <span>
            {page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length}
          </span>
          <div>
            <button type="button" className="icon-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label="Previous page">
              <Icon name="chevronLeft" size={16} />
            </button>
            <button type="button" className="icon-btn" onClick={() => setPage((p) => p + 1)} disabled={page >= pages - 1} aria-label="Next page">
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
