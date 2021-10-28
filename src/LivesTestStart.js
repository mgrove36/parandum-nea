import React from "react";
import { CloseRounded as CloseRoundedIcon, ArrowForwardRounded as ArrowForwardRoundedIcon } from "@material-ui/icons";
import Button from "./Button";
import Checkbox from '@material-ui/core/Checkbox';

import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export default function LivesTestStart(props) {
	return (
		<>
			<div className="overlay" onClick={props.hide}></div>
			<div className="overlay-content slider-overlay-content">
				<h1>Number of Lives</h1>

				<div className="slider-container">
					<Slider
						min={1}
						max={props.max}
						value={props.sliderValue}
						onChange={props.onSliderChange}
						railStyle={{
							backgroundColor: getComputedStyle(
								document.querySelector("#root > div")
							).getPropertyValue("--text-color")
								.trim(),
							border: 0,
						}}
						handleStyle={{
							backgroundColor: getComputedStyle(
								document.querySelector("#root > div")
							).getPropertyValue("--primary-color")
								.trim(),
							border: 0,
						}}
						trackStyle={{
							backgroundColor: getComputedStyle(
								document.querySelector("#root > div")
							).getPropertyValue("--primary-color-tinted")
								.trim(),
						}}
					/>
					<input
						type="number"
						onKeyDown={(event) => !isNaN(Number(event.key))}
						onChange={(event) => props.onSliderChange(Number(event.target.value))}
						value={props.sliderValue}
						min={1}
						max={props.max}
						size="1"
						autoComplete="off"
					/>
				</div>

				<label>
					<Checkbox
						checked={props.switchLanguage}
						onChange={props.handleSwitchLanguageChange}
						inputProps={{ 'aria-label': 'checkbox' }}
					/>
					<span>Switch language</span>
				</label>

				<Button
					onClick={() => props.startTest("lives")}
					icon={<ArrowForwardRoundedIcon />}
					className="button--round continue-button"
					loading={props.loading}
					disabled={props.disabled || props.loading}
				></Button>

				<Button
					onClick={props.hide}
					icon={<CloseRoundedIcon />}
					className="button--no-background popup-close-button"
				></Button>
			</div>
		</>
	)
}
