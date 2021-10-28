import React from 'react';
import Chart from "react-apexcharts";

export default function LineChart (props) {
	const themeColor = getComputedStyle(
			document.querySelector("#root > div")
		).getPropertyValue("--primary-color")
		.trim();
	const overlayColor = getComputedStyle(
			document.querySelector("#root > div")
		).getPropertyValue("--overlay-color")
		.trim();
	const textColor = getComputedStyle(
			document.querySelector("#root > div")
		).getPropertyValue("--text-color")
		.trim();

	const options = {
		xaxis: {
			type: "datetime",
			tooltip: {
				enabled: false,
			},
		},
		yaxis: {
			min: 0,
			max: 100,
			labels: {
				formatter: (value) => `${value.toFixed(0)}%`
			},
			tickAmount: 5,
		},
		chart: {
			foreColor: textColor,
			toolbar: {
				show: false,
			},
			fontFamily: "Hind, sans-serif",
			offsetX: -15,
			zoom: {
				enabled: false,
			},
		},
		colors: [
			themeColor
		],
		tooltip: {
			theme: "dark",
			x: {
				show: typeof props.sets !== "undefined",
				formatter: (value, opt) => typeof props.sets !== "undefined" ? props.sets[opt.dataPointIndex] : null,
			},
		},
		stroke: {
			width: 3,
			curve: 'smooth',
		},
		grid: {
			borderColor: overlayColor,
			xaxis: {
				lines: {
					show: true
				}
			},
		},
		markers: {
			size: 1
		},
		responsive: [{
			breakpoint: 600,
			options: {
				chart: {
					height: "200px",
				},
			},
		}],
		annotations: 
			props.currentPointX ? {
				xaxis: [
					{
						x: new Date(props.currentPointX).getTime(),
						strokeDashArray: 5,
						borderColor: themeColor,
					}
				],
			} : {},
	};
	const series = [
		{
			name: "",
			data: props.data,
		}
	];

  	return (
		<>
			<Chart
				options={options}
				series={series}
				type="line"
				height="250px"
				className="chart"
			/>
		</>
	)
}