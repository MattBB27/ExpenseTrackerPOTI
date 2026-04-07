/**
 * components/CategoryChart.jsx — Doughnut chart showing spending breakdown
 * by category. Uses react-chartjs-2 with Chart.js.
 */

import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { CATEGORY_COLORS } from "../App";

// Register required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoryChart({ data }) {
  const labels  = data.map((d) => d._id);
  const values  = data.map((d) => d.total);
  const colors  = data.map((d) => CATEGORY_COLORS[d._id] || "#8b8fa8");

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors.map((c) => c + "cc"), // slight transparency
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8,
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#8b8fa8",
          font: { size: 11 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: "#1a1d27",
        borderColor: "#2e3250",
        borderWidth: 1,
        titleColor: "#e8eaf6",
        bodyColor: "#8b8fa8",
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct   = ((ctx.parsed / total) * 100).toFixed(1);
            const val   = ctx.parsed.toLocaleString("en-AU", {
              style: "currency",
              currency: "AUD",
            });
            return ` ${val} (${pct}%)`;
          },
        },
      },
    },
  };

  return <Doughnut data={chartData} options={options} />;
}
