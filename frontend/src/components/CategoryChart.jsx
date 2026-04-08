// Chart showing spending breakdown by category
// Uses react-chartjs-2 (react wrapper for Chart.js)

import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { CATEGORY_COLORS } from "../app";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function CategoryChart({ data }) {
  const labels = data.map(d => d._id);
  const values = data.map(d => d.total);
  const colors = data.map(d => CATEGORY_COLORS[d._id] || "#8b8fa8");

  return (
    <Doughnut
      data={{
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.map(c => c + "cc"),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 8,
        }],
      }}
      options={{
        responsive: true,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#8b8fa8",
              font: { size: 13 },
              padding: 16,
              usePointStyle: true,
            },
          },
          
          datalabels: {
            color: "#fff",
            font: {
              weight: "bold",
              size: 11,
            },
            formatter: (value, ctx) => {
              const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = (value / total) * 100;
              return percentage < 2 ? "" : percentage.toFixed(1) + "%";
            },
          },

          tooltip: {
            backgroundColor: "#1a1d27",
            borderColor: "#2e3250",
            borderWidth: 1,
            titleColor: "#e8eaf6",
            bodyColor: "#8b8fa8",
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                const val = ctx.parsed.toLocaleString("en-AU", {
                  style: "currency",
                  currency: "AUD"
                });
                return ` ${val} (${pct}%)`;
              },
            },
          },
        },
      }}
    />
  );
}