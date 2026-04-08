// Bar chart showing monthly spending totals for the last 12 months 
// Uses react-chartjs-2 (react wrapper for Chart.js)

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
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

// --- Helpers ---

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Converts MongoDB aggregation into data chart.js can use
function buildChartData(rawData) {
  const map = {};
  rawData.forEach(({ _id, total }) => {
    map[`${_id.year}-${_id.month}`] = total;
  });

  // Generate last 12 months (chronological order)
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

// --- Component ---

export default function MonthlyChart({ data }) {
  const { labels, values } = buildChartData(data);
  const max = Math.max(...values);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Total Spent ($)",
        data: values,

        // Current month highlighted
        backgroundColor: values.map((v, i) =>
          i === values.length - 1
            ? "rgb(238, 61, 223)"
            : "rgba(108, 99, 255, 0.6)"
        ),

        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 36,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 25
      },
    },

    plugins: {
      datalabels: {
        anchor: "end",
        align: "top",
        offset: 2,
        clamp: true,
        color: "#e8eaf6",
        font: {
          weight: "bold",
          size: 11,
        },
        formatter: (value) => {
          if (value === 0) return "";
          return `$${value.toLocaleString()}`;
        },
      },

      legend: { display: false },

      tooltip: {
        backgroundColor: "#1a1d27",
        borderColor: "#2e3250",
        borderWidth: 1,
        titleColor: "#e8eaf6",
        bodyColor: "#8b8fa8",
        callbacks: {
          label: (ctx) =>
            ` $${ctx.parsed.y.toLocaleString("en-AU", {
              minimumFractionDigits: 2,
            })}`,
        },
      },
    },

    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#8b8fa8",
          font: { size: 13 },
        },
      },

      y: {
        beginAtZero: true,
        suggestedMax: max * 1.1, // fix $ label not appearing 
        grid: {
          color: "rgba(46, 50, 80, 0.4)",
        },
        ticks: {
          color: "#8b8fa8",
          font: { size: 13 },
          callback: (v) => `$${v.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div style={{ height: "500px" }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}