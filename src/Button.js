import React from 'react';
import "./css/Button.css";

import Loader from "./puff-loader.svg";

export default function Button(props) {
	let newProps = {...props};
	delete newProps["icon"];
	delete newProps["className"];
	delete newProps["children"];
	delete newProps["loading"];
	delete newProps["disabled"];
	return (
		<button
			className={`button ${props.className ? props.className : ""} ${props.icon && props.children ? "button--icon-and-text" : ""} ${props.loading ? "button--loading" : ""} ${props.disabled ? "button--disabled" : ""}`}
			{...newProps}
		>
			{ props.loading ? <img className="button-loader" src={Loader} alt="Loading..." /> : "" }
			{ props.icon
				?
				<span className="button-icon">
					{props.icon}
				</span>
				:
				""
			}
			<span className="button-children">
				{props.children}
			</span>
		</button>
	)
}
