"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSeries } from "@/lib/types";

const TEAL = "#0e857e";
const INK = "#13202d";
const MUTED = "#5b6874";

interface TipProps {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number; derived?: boolean } }>;
  unit: string;
}

function ChartTip({ active, payload, unit }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-line-strong bg-paper px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-ink">{p.label}</p>
      <p className="tnum text-ink-soft">
        {p.value}
        {unit.startsWith("%") ? "%" : ""}{" "}
        <span className="text-muted">{unit.replace(/^%\s*/, "")}</span>
      </p>
      {p.derived ? (
        <p className="mt-1 max-w-52 text-xs text-saffron-700">
          Derived by subtraction, not reported by the source.
        </p>
      ) : null}
    </div>
  );
}

/** Horizontal bar chart used for city share and maturity mix. */
export function ShareBarChart({
  series,
  height = 280,
  labelWidth = 150,
}: {
  series: ChartSeries;
  height?: number;
  labelWidth?: number;
}) {
  const max = Math.max(...series.items.map((i) => i.value));
  const domainMax = Math.ceil((max * 1.18) / 5) * 5;

  return (
    <figure aria-label={`${series.title}. ${series.subtitle}`} className="m-0">
      <div style={{ height }} className="w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 560, height }}
        >
          <BarChart
            data={series.items}
            layout="vertical"
            margin={{ top: 4, right: 36, bottom: 4, left: 0 }}
            barCategoryGap={12}
          >
            <defs>
              <pattern
                id={`hatch-${series.id}`}
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill="#fdf3e7" />
                <rect width="2.5" height="6" fill="#e5822b" opacity="0.55" />
              </pattern>
            </defs>
            <XAxis type="number" hide domain={[0, domainMax]} />
            <YAxis
              type="category"
              dataKey="label"
              width={labelWidth}
              tickLine={false}
              axisLine={false}
              tick={{ fill: INK, fontSize: 13 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(11,108,103,0.06)" }}
              content={<ChartTip unit={series.unit} />}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
              {series.items.map((item) => (
                <Cell
                  key={item.label}
                  fill={item.derived ? `url(#hatch-${series.id})` : TEAL}
                  stroke={item.derived ? "#e5822b" : "none"}
                  strokeWidth={item.derived ? 1 : 0}
                />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v) => `${v}%`}
                style={{ fill: MUTED, fontSize: 12, fontVariantNumeric: "tabular-nums" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>{series.title}</caption>
          <thead>
            <tr>
              <th>Group</th>
              <th>{series.unit}</th>
            </tr>
          </thead>
          <tbody>
            {series.items.map((i) => (
              <tr key={i.label}>
                <td>{i.label}</td>
                <td>
                  {i.value}%{i.derived ? " (derived)" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
