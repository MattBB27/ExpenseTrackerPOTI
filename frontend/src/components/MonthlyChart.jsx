/**
 * components/MonthlyChart.jsx — Bar chart showing monthly spending totals
 * for the last 12 months. Uses react-chartjs-2 with Chart.js.
 */

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register required Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Converts the MongoDB aggregation result into Chart.js-compatible data.
 * Fills in zero for any missing months in the last 12.
 */
function buildChartData(rawData) {
  // Build a map: "YYYY-M" → total
  const map = {};
  rawData.forEach(({ _id, total }) => {
    map[`${_id.year}-${_id.month}`] = total;
  });

  // Generate last 12 months in order
  const labels = [];
  const values = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    labels.push(MONTH_NAMES[d.getMonth()]);
    values.push(map[key] ?? 0);
  }

  return { labels, values };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MonthlyChart({ data }) {
  const { labels, values } = buildChartData(data);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Total Spent ($)",
        data: values,
        backgroundColor: "rgba(108, 99, 255, 0.75)",
        borderColor: "rgba(108, 99, 255, 1)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: "rgba(108, 99, 255, 1)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a1d27",
        borderColor: "#2e3250",
        borderWidth: 1,
        titleColor: "#e8eaf6",
        bodyColor: "#8b8fa8",
        callbacks: {
          label: (ctx) =>
            ` $${ctx.parsed.y.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "#2e3250" },
        ticks: { color: "#8b8fa8", font: { size: 11 } },
      },
      y: {
        grid: { color: "#2e3250" },
        ticks: {
          color: "#8b8fa8",
          font: { size: 11 },
          callback: (v) => `$${v.toLocaleString()}`,
        },
        beginAtZero: true,
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}
