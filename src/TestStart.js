import React from "react";
import Loader from "./puff-loader.svg";

export default function TestStart(props) {
	return (
		<>
			<div className="overlay" onClick={props.hideTestStart}></div>
			<div className="overlay-content options-list-overlay-content">

				{
					props.loading
					?
					<img className="button-loader" src={Loader} alt="Loading..." />
					:
					<>
						{
							// ["Classic", "Lives", "Countdown"].map((mode) =>
							["Classic", "Lives"].map((mode) =>
								<h3
									key={mode}
									onClick={() => props.showIndividualTestPrompt(mode.toLowerCase())}
								>
									{mode}
								</h3>
							)
						}
						<div onClick={props.hideTestStart}>
							Cancel
						</div>
					</>
				}

			</div>
		</>
	)
}
