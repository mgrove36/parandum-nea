import React from "react";

export default function CountdownTestStart(props) {
	return (
		<>
			<div className="overlay" onClick={props.hideTestStart}></div>
			<div className="overlay-content options-list-overlay-content">
				Awaiting content

				<div onClick={props.hideTestStart}>
					Cancel
				</div>
			</div>
		</>
	)
}
